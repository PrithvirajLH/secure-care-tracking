const { getPool, sql } = require('./helpers');
const { AuditActions } = require('./auditConstants');

module.exports = {
  AuditActions,

  /**
   * Log an audit entry
   * @param {Object} params - Audit parameters
   * @param {string} params.userIdentifier - User who performed the action
   * @param {string} params.action - Action type (use AuditActions constants)
   * @param {string} [params.tableName] - Table that was modified
   * @param {number} [params.recordId] - Primary key of the modified record
   * @param {string} [params.employeeNumber] - Employee number affected
   * @param {string} [params.employeeName] - Employee name affected
   * @param {string} [params.awardType] - Award type/level affected
   * @param {string} [params.fieldName] - Field that was changed
   * @param {string} [params.oldValue] - Previous value
   * @param {string} [params.newValue] - New value
   * @param {string} [params.details] - Human-readable description
   * @param {string} [params.ipAddress] - IP address of the request
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
      const pool = await getPool();
      const request = pool.request();

      request.input('userIdentifier', sql.NVarChar, userIdentifier || 'unknown');
      request.input('action', sql.NVarChar, action);
      request.input('tableName', sql.NVarChar, tableName);
      request.input('recordId', sql.Int, recordId);
      request.input('employeeNumber', sql.NVarChar, employeeNumber);
      request.input('employeeName', sql.NVarChar, employeeName);
      request.input('awardType', sql.NVarChar, awardType);
      request.input('fieldName', sql.NVarChar, fieldName);
      request.input('oldValue', sql.NVarChar, oldValue ? String(oldValue) : null);
      request.input('newValue', sql.NVarChar, newValue ? String(newValue) : null);
      request.input('details', sql.NVarChar, details);
      request.input('ipAddress', sql.NVarChar, ipAddress);

      await request.query(`
        INSERT INTO dbo.AuditLog 
        (userIdentifier, action, tableName, recordId, employeeNumber, employeeName, awardType, fieldName, oldValue, newValue, details, ipAddress)
        VALUES 
        (@userIdentifier, @action, @tableName, @recordId, @employeeNumber, @employeeName, @awardType, @fieldName, @oldValue, @newValue, @details, @ipAddress)
      `);

      return { success: true };
    } catch (error) {
      // Log error but don't throw - audit logging should not break main functionality
      console.error('Audit log error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get audit logs with filtering and pagination
   * @param {Object} filters - Filter parameters
   */
  async getAuditLogs(filters = {}) {
    const pool = await getPool();
    const request = pool.request();

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let countConditions = [];

    // Date range filter
    if (filters.startDate) {
      request.input('startDate', sql.DateTime2, new Date(filters.startDate));
      whereConditions.push('timestamp >= @startDate');
      countConditions.push('timestamp >= @startDate');
    }

    if (filters.endDate) {
      // Add one day to include the entire end date
      const endDate = new Date(filters.endDate);
      endDate.setDate(endDate.getDate() + 1);
      request.input('endDate', sql.DateTime2, endDate);
      whereConditions.push('timestamp < @endDate');
      countConditions.push('timestamp < @endDate');
    }

    // User filter
    if (filters.user && filters.user !== 'all') {
      request.input('userIdentifier', sql.NVarChar, filters.user);
      whereConditions.push('userIdentifier = @userIdentifier');
      countConditions.push('userIdentifier = @userIdentifier');
    }

    // Action filter
    if (filters.action && filters.action !== 'all') {
      request.input('action', sql.NVarChar, filters.action);
      whereConditions.push('action = @action');
      countConditions.push('action = @action');
    }

    // Search filter (employee name or number)
    if (filters.search) {
      request.input('search', sql.NVarChar, `%${filters.search}%`);
      whereConditions.push('(employeeName LIKE @search OR employeeNumber LIKE @search)');
      countConditions.push('(employeeName LIKE @search OR employeeNumber LIKE @search)');
    }

    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ') 
      : '';

    const countWhereClause = countConditions.length > 0 
      ? 'WHERE ' + countConditions.join(' AND ') 
      : '';

    // Get total count
    const countResult = await request.query(`
      SELECT COUNT(*) as total FROM dbo.AuditLog ${countWhereClause}
    `);
    const totalItems = countResult.recordset[0].total;

    // Get paginated results
    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, limit);

    const result = await request.query(`
      SELECT 
        auditId,
        timestamp,
        userIdentifier,
        action,
        tableName,
        recordId,
        employeeNumber,
        employeeName,
        awardType,
        fieldName,
        oldValue,
        newValue,
        details,
        ipAddress
      FROM dbo.AuditLog
      ${whereClause}
      ORDER BY timestamp DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);

    return {
      logs: result.recordset,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        itemsPerPage: limit
      }
    };
  },

  /**
   * Get unique users who have made changes (for filter dropdown)
   */
  async getAuditUsers() {
    const pool = await getPool();
    const request = pool.request();

    const result = await request.query(`
      SELECT DISTINCT userIdentifier 
      FROM dbo.AuditLog 
      WHERE userIdentifier IS NOT NULL
      ORDER BY userIdentifier
    `);

    return result.recordset.map(r => r.userIdentifier);
  },

  /**
   * Get audit log statistics
   */
  async getAuditStats() {
    const pool = await getPool();
    const request = pool.request();

    // Get counts by action type
    const actionCounts = await request.query(`
      SELECT action, COUNT(*) as count 
      FROM dbo.AuditLog 
      GROUP BY action 
      ORDER BY count DESC
    `);

    // Get counts for last 7 days
    const last7Days = await request.query(`
      SELECT CAST(timestamp AS DATE) as date, COUNT(*) as count 
      FROM dbo.AuditLog 
      WHERE timestamp >= DATEADD(day, -7, GETUTCDATE())
      GROUP BY CAST(timestamp AS DATE)
      ORDER BY date DESC
    `);

    // Get most active users
    const topUsers = await request.query(`
      SELECT TOP 5 userIdentifier, COUNT(*) as count 
      FROM dbo.AuditLog 
      GROUP BY userIdentifier 
      ORDER BY count DESC
    `);

    return {
      actionCounts: actionCounts.recordset,
      last7Days: last7Days.recordset,
      topUsers: topUsers.recordset
    };
  },

  /**
   * Helper to get employee info for audit logging
   */
  async getEmployeeInfoForAudit(employeeId) {
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
};
