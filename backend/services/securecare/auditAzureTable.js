const { TableClient, TableServiceClient } = require('@azure/data-tables');
require('dotenv').config();

// Action type constants for consistency
const AuditActions = {
  TRAINING_SCHEDULED: 'TRAINING_SCHEDULED',
  TRAINING_COMPLETED: 'TRAINING_COMPLETED',
  DATE_EDITED: 'DATE_EDITED',
  CONFERENCE_APPROVED: 'CONFERENCE_APPROVED',
  CONFERENCE_REJECTED: 'CONFERENCE_REJECTED',
  NOTES_UPDATED: 'NOTES_UPDATED',
  ADVISOR_CHANGED: 'ADVISOR_CHANGED',
  ADVISOR_ADDED: 'ADVISOR_ADDED',
};

// Configuration
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AUDIT_TABLE_NAME = process.env.AUDIT_TABLE_NAME || 'SecureCareAuditLog';

let tableClient = null;

/**
 * Initialize the Azure Table client
 */
async function getTableClient() {
  if (!tableClient) {
    if (!AZURE_STORAGE_CONNECTION_STRING) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is not set');
    }
    
    tableClient = TableClient.fromConnectionString(
      AZURE_STORAGE_CONNECTION_STRING,
      AUDIT_TABLE_NAME
    );
    
    // Create table if it doesn't exist
    try {
      await tableClient.createTable();
      console.log(`✅ Azure Table '${AUDIT_TABLE_NAME}' is ready`);
    } catch (error) {
      // Table already exists - this is fine
      if (error.statusCode !== 409) {
        console.error('Error creating audit table:', error.message);
      }
    }
  }
  return tableClient;
}

/**
 * Generate a unique row key with timestamp for ordering
 * Format: TIMESTAMP_RANDOM (ensures uniqueness and chronological ordering)
 */
function generateRowKey() {
  // Use inverted timestamp so newest entries come first when querying
  const invertedTimestamp = String(9999999999999 - Date.now()).padStart(13, '0');
  const random = Math.random().toString(36).substring(2, 10);
  return `${invertedTimestamp}_${random}`;
}

/**
 * Generate partition key based on date (YYYY-MM format for monthly partitions)
 * This allows efficient querying by month
 */
function generatePartitionKey(date = new Date()) {
  return date.toISOString().substring(0, 7); // YYYY-MM
}

// Helper to get employee info for audit logging (uses SQL Server)
const { getPool, sql } = require('./helpers');

async function getEmployeeInfoForAudit(employeeId) {
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('employeeId', sql.Int, employeeId);

    const result = await request.query(`
      SELECT employeeId, employeeNumber, name, awardType
      FROM dbo.SecureCareEmployee 
      WHERE employeeId = @employeeId
    `);

    if (result.recordset.length > 0) {
      return result.recordset[0];
    }
    return null;
  } catch (error) {
    console.error('Error getting employee info for audit:', error);
    return null;
  }
}

module.exports = {
  AuditActions,

  /**
   * Log an audit entry to Azure Table Storage
   */
  async logAudit({
    userIdentifier,
    action,
    tableName = 'SecureCareEmployee',
    recordId = null,
    employeeNumber = null,
    employeeName = null,
    awardType = null,
    fieldName = null,
    oldValue = null,
    newValue = null,
    details = null,
    ipAddress = null
  }) {
    try {
      const client = await getTableClient();
      const timestamp = new Date();
      
      const entity = {
        partitionKey: generatePartitionKey(timestamp),
        rowKey: generateRowKey(),
        timestamp: timestamp.toISOString(),
        userIdentifier: userIdentifier || 'unknown',
        action: action,
        tableName: tableName || null,
        recordId: recordId || null,
        employeeNumber: employeeNumber || null,
        employeeName: employeeName || null,
        awardType: awardType || null,
        fieldName: fieldName || null,
        oldValue: oldValue ? String(oldValue) : null,
        newValue: newValue ? String(newValue) : null,
        details: details || null,
        ipAddress: ipAddress || null
      };

      await client.createEntity(entity);
      return { success: true };
    } catch (error) {
      // Log error but don't throw - audit logging should not break main functionality
      console.error('Azure Table audit log error:', error.message);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get audit logs with filtering and pagination
   */
  async getAuditLogs(filters = {}) {
    try {
      const client = await getTableClient();
      
      const page = parseInt(filters.page) || 1;
      const limit = parseInt(filters.limit) || 50;
      
      // Build OData filter
      let filterParts = [];
      
      // Date range filter using partition keys for efficiency
      if (filters.startDate) {
        const startPartition = filters.startDate.substring(0, 7); // YYYY-MM
        filterParts.push(`PartitionKey ge '${startPartition}'`);
        filterParts.push(`timestamp ge datetime'${filters.startDate}T00:00:00Z'`);
      }
      
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setDate(endDate.getDate() + 1);
        const endPartition = endDate.toISOString().substring(0, 7);
        filterParts.push(`PartitionKey le '${endPartition}'`);
        filterParts.push(`timestamp lt datetime'${endDate.toISOString()}'`);
      }
      
      // User filter
      if (filters.user && filters.user !== 'all') {
        filterParts.push(`userIdentifier eq '${filters.user}'`);
      }
      
      // Action filter
      if (filters.action && filters.action !== 'all') {
        filterParts.push(`action eq '${filters.action}'`);
      }
      
      const filterQuery = filterParts.length > 0 ? filterParts.join(' and ') : undefined;
      
      // Query entities
      const queryOptions = filterQuery ? { filter: filterQuery } : {};
      
      const entities = [];
      const iterator = client.listEntities(queryOptions);
      
      // Collect all matching entities (we need to do client-side pagination and search)
      for await (const entity of iterator) {
        // Client-side search filter (Azure Tables doesn't support LIKE/contains)
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const nameMatch = entity.employeeName?.toLowerCase().includes(searchLower);
          const numberMatch = entity.employeeNumber?.toLowerCase().includes(searchLower);
          if (!nameMatch && !numberMatch) {
            continue;
          }
        }
        entities.push(entity);
      }
      
      // Sort by timestamp descending (row keys are already inverted for this)
      entities.sort((a, b) => a.rowKey.localeCompare(b.rowKey));
      
      // Calculate pagination
      const totalItems = entities.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const paginatedEntities = entities.slice(startIndex, startIndex + limit);
      
      // Transform to match expected format
      const logs = paginatedEntities.map((entity, index) => ({
        auditId: startIndex + index + 1, // Generate a sequential ID for display
        timestamp: entity.timestamp,
        userIdentifier: entity.userIdentifier,
        action: entity.action,
        tableName: entity.tableName,
        recordId: entity.recordId,
        employeeNumber: entity.employeeNumber,
        employeeName: entity.employeeName,
        awardType: entity.awardType,
        fieldName: entity.fieldName,
        oldValue: entity.oldValue,
        newValue: entity.newValue,
        details: entity.details,
        ipAddress: entity.ipAddress
      }));
      
      return {
        logs,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit
        }
      };
    } catch (error) {
      console.error('Error getting audit logs from Azure Table:', error.message);
      throw error;
    }
  },

  /**
   * Get unique users who have made changes (for filter dropdown)
   */
  async getAuditUsers() {
    try {
      const client = await getTableClient();
      const users = new Set();
      
      // Query all entities and collect unique users
      // Note: In production with lots of data, you might want to maintain a separate index
      const iterator = client.listEntities({
        select: ['userIdentifier']
      });
      
      for await (const entity of iterator) {
        if (entity.userIdentifier) {
          users.add(entity.userIdentifier);
        }
      }
      
      return Array.from(users).sort();
    } catch (error) {
      console.error('Error getting audit users from Azure Table:', error.message);
      return [];
    }
  },

  /**
   * Get audit log statistics
   */
  async getAuditStats() {
    try {
      const client = await getTableClient();
      
      const actionCounts = {};
      const userCounts = {};
      const dailyCounts = {};
      
      // Calculate date 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString();
      
      const iterator = client.listEntities();
      
      for await (const entity of iterator) {
        // Count by action
        actionCounts[entity.action] = (actionCounts[entity.action] || 0) + 1;
        
        // Count by user
        userCounts[entity.userIdentifier] = (userCounts[entity.userIdentifier] || 0) + 1;
        
        // Count by day (last 7 days only)
        if (entity.timestamp >= sevenDaysAgoStr) {
          const date = entity.timestamp.substring(0, 10); // YYYY-MM-DD
          dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        }
      }
      
      // Format results
      const actionCountsArray = Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count);
      
      const topUsers = Object.entries(userCounts)
        .map(([userIdentifier, count]) => ({ userIdentifier, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      const last7Days = Object.entries(dailyCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => b.date.localeCompare(a.date));
      
      return {
        actionCounts: actionCountsArray,
        last7Days,
        topUsers
      };
    } catch (error) {
      console.error('Error getting audit stats from Azure Table:', error.message);
      return {
        actionCounts: [],
        last7Days: [],
        topUsers: []
      };
    }
  },

  getEmployeeInfoForAudit
};
