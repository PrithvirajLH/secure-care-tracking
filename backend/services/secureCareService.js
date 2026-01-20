const { getPool, sql } = require('../config/database');

// Simple in-memory cache for analytics (for production, consider Redis)
const analyticsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const normalizeSortOrder = (value) => (String(value).toLowerCase() === 'desc' ? 'DESC' : 'ASC');

class SecureCareService {
  
  // Cache helper methods
  getCacheKey(method, filters) {
    return `${method}_${JSON.stringify(filters)}`;
  }
  
  getFromCache(key) {
    const cached = analyticsCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    analyticsCache.delete(key);
    return null;
  }
  
  setCache(key, data) {
    analyticsCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
  
  // Get employees by level (or all levels) using direct table queries
  async getEmployeesByLevel(level, filters = {}) {
    const pool = await getPool();
    
    // Build the base query for the SecureCareEmployee table
    let query = `
      SELECT 
        e.employeeId,
        e.employeeNumber,
        e.name AS Employee,
        e.facility AS Facility,
        e.area AS Area,
        e.staffRoll,
        e.awardType,
        e.assignedDate,
        e.completedDate,
        e.conferenceCompleted,
        e.scheduleStandingVideo,
        e.standingVideo,
        e.scheduleSleepingVideo,
        e.sleepingVideo,
        e.scheduleFeedGradVideo,
        e.feedGradVideo,
        e.schedulenoHandnoSpeak,
        e.noHandnoSpeak,
        e.[scheduleSession#1] AS scheduleSession1,
        e.[session#1] AS session1,
        e.[scheduleSession#2] AS scheduleSession2,
        e.[session#2] AS session2,
        e.[scheduleSession#3] AS scheduleSession3,
        e.[session#3] AS session3,
        e.secureCareAwarded,
        e.secureCareAwardedDate,
        e.awaiting,
        e.notes,
        e.advisorId,
        a.firstName + ' ' + ISNULL(a.lastName, '') as advisorName
      FROM dbo.SecureCareEmployee e
      LEFT JOIN dbo.Advisor a ON e.advisorId = a.advisorId
    `;
    
    const request = pool.request();
    
    // Apply level filter unless requesting all levels
    const isAllLevels = !level || level.toLowerCase() === 'all' || level.toLowerCase() === 'all levels';
    if (!isAllLevels) {
      query += ` WHERE e.awardType = @level`;
      request.input('level', sql.VarChar, level);
    }
    
    // Apply additional filters
    // Handle facility filter - can be string or array
    if (filters.facility && filters.facility !== 'all') {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      if (facilities.length === 1) {
        // Single facility - use simple equality
        query += ` ${isAllLevels ? 'WHERE' : 'AND'} e.facility = @facility0`;
        request.input('facility0', sql.VarChar, facilities[0]);
      } else if (facilities.length > 1) {
        // Multiple facilities - use IN clause with parameterized values
        const facilityParams = facilities.map((f, i) => `@facility${i}`).join(', ');
        query += ` ${isAllLevels ? 'WHERE' : 'AND'} e.facility IN (${facilityParams})`;
        facilities.forEach((f, i) => {
          request.input(`facility${i}`, sql.VarChar, f);
        });
      }
    }
    
    if (filters.area && filters.area !== 'all') {
      query += ` ${query.includes('WHERE') ? 'AND' : 'WHERE'} e.area = @area`;
      request.input('area', sql.VarChar, filters.area);
    }
    
      if (filters.search) {
        query += ` ${query.includes('WHERE') ? 'AND' : 'WHERE'} (e.name LIKE @search OR e.employeeNumber LIKE @search)`;
        request.input('search', sql.VarChar, `%${filters.search}%`);
      }
      
      if (filters.jobTitle && filters.jobTitle !== 'all') {
        query += ` ${query.includes('WHERE') ? 'AND' : 'WHERE'} e.staffRoll = @jobTitle`;
        request.input('jobTitle', sql.VarChar, filters.jobTitle);
      }
      
      // Server-side date filter (exact match on specified field)
      // For training fields, check both completed and scheduled dates
      if (filters.dateField && filters.date) {
        const df = String(filters.dateField);
        const date = filters.date; // YYYY-MM-DD
        const fieldMap = {
          completedDate: 'e.completedDate',
          standingVideo: 'e.standingVideo',
          sleepingVideo: 'e.sleepingVideo',
          feedGradVideo: 'e.feedGradVideo',
          noHandnoSpeak: 'e.noHandnoSpeak',
          session1: 'e.[session#1]',
          session2: 'e.[session#2]',
          session3: 'e.[session#3]',
          conferenceCompleted: 'e.conferenceCompleted',
          secureCareAwardedDate: 'e.secureCareAwardedDate',
          scheduleStandingVideo: 'e.scheduleStandingVideo',
          scheduleSleepingVideo: 'e.scheduleSleepingVideo',
          scheduleFeedGradVideo: 'e.scheduleFeedGradVideo',
          schedulenoHandnoSpeak: 'e.schedulenoHandnoSpeak',
          scheduleSession1: 'e.[scheduleSession#1]',
          scheduleSession2: 'e.[scheduleSession#2]',
          scheduleSession3: 'e.[scheduleSession#3]'
        };
        
        // Map training fields to their scheduled counterparts
        const scheduleFieldMap = {
          'standingVideo': 'scheduleStandingVideo',
          'sleepingVideo': 'scheduleSleepingVideo',
          'feedGradVideo': 'scheduleFeedGradVideo',
          'noHandnoSpeak': 'schedulenoHandnoSpeak',
          'session1': 'scheduleSession1',
          'session2': 'scheduleSession2',
          'session3': 'scheduleSession3'
        };
        
        const column = fieldMap[df];
        const scheduleColumn = scheduleFieldMap[df] ? fieldMap[scheduleFieldMap[df]] : null;
        
        if (column) {
          // For training fields that have both completed and scheduled versions, check both
          if (scheduleColumn) {
            // Use ISNULL to handle NULL values properly - check if either field matches the date
            query += ` ${query.includes('WHERE') ? 'AND' : 'WHERE'} (
              (${column} IS NOT NULL AND CAST(${column} AS DATE) = @filterDate) OR 
              (${scheduleColumn} IS NOT NULL AND CAST(${scheduleColumn} AS DATE) = @filterDate)
            )`;
          } else {
            // For fields without scheduled versions (like conferenceCompleted, secureCareAwardedDate), only check the one field
            query += ` ${query.includes('WHERE') ? 'AND' : 'WHERE'} ${column} IS NOT NULL AND CAST(${column} AS DATE) = @filterDate`;
          }
          request.input('filterDate', sql.Date, date);
        }
      }

      // Status filter - this is complex as it depends on awardType and completion status
      if (filters.status && filters.status !== 'all') {
        let statusCondition = '';
        switch (filters.status) {
        case 'Level 1 In Progress':
          statusCondition = `(e.awardType = 'Level 1' AND e.assignedDate IS NOT NULL AND (e.secureCareAwarded IS NULL OR e.secureCareAwarded = 0))`;
          break;
          case 'Level 1 Completed':
            statusCondition = `(e.awardType = 'Level 1' AND e.secureCareAwarded = 1)`;
            break;
        case 'Level 2 In Progress':
          statusCondition = `(e.awardType = 'Level 2' AND e.conferenceCompleted IS NOT NULL AND e.conferenceCompleted != '' AND e.awaiting = 0 AND (e.secureCareAwarded IS NULL OR e.secureCareAwarded = 0))`;
          break;
          case 'Level 2 Completed':
            statusCondition = `(e.awardType = 'Level 2' AND e.secureCareAwarded = 1)`;
            break;
        case 'Level 3 In Progress':
          statusCondition = `(e.awardType = 'Level 3' AND e.conferenceCompleted IS NOT NULL AND e.conferenceCompleted != '' AND e.awaiting = 0 AND (e.secureCareAwarded IS NULL OR e.secureCareAwarded = 0))`;
          break;
          case 'Level 3 Completed':
            statusCondition = `(e.awardType = 'Level 3' AND e.secureCareAwarded = 1)`;
            break;
        case 'Consultant In Progress':
          statusCondition = `(e.awardType = 'Consultant' AND e.conferenceCompleted IS NOT NULL AND e.conferenceCompleted != '' AND e.awaiting = 0 AND (e.secureCareAwarded IS NULL OR e.secureCareAwarded = 0))`;
          break;
          case 'Consultant Completed':
            statusCondition = `(e.awardType = 'Consultant' AND e.secureCareAwarded = 1)`;
            break;
        case 'Coach In Progress':
          statusCondition = `(e.awardType = 'Coach' AND e.conferenceCompleted IS NOT NULL AND e.conferenceCompleted != '' AND e.awaiting = 0 AND (e.secureCareAwarded IS NULL OR e.secureCareAwarded = 0))`;
          break;
          case 'Coach Completed':
            statusCondition = `(e.awardType = 'Coach' AND e.secureCareAwarded = 1)`;
            break;
          case 'Awaiting Approval':
            statusCondition = `(e.conferenceCompleted IS NOT NULL AND e.conferenceCompleted != '' AND e.awaiting = 1)`;
            break;
          case 'Rejected Approval':
            statusCondition = `(e.conferenceCompleted IS NOT NULL AND e.conferenceCompleted != '' AND e.awaiting IS NULL)`;
            break;
        }
        if (statusCondition) {
          query += ` ${query.includes('WHERE') ? 'AND' : 'WHERE'} ${statusCondition}`;
        }
      }
      
      // Add pagination
    const page = parseInt(filters.page) || 1;
    const requestedLimit = parseInt(filters.limit) || 50;
    // Allow larger limits for dashboard (up to 10,000) but cap at 100 for regular pagination
    const limit = requestedLimit > 100 ? Math.min(requestedLimit, 10000) : Math.min(requestedLimit, 100);
    const offset = (page - 1) * limit;
    
    // Add sorting support - default to name sorting
    const sortBy = filters.sortBy || 'name';
    const sortOrder = normalizeSortOrder(filters.sortOrder);
    
    let orderClause = '';
    switch (sortBy) {
      case 'latest':
        orderClause = `ORDER BY assignedDate ${sortOrder.toUpperCase()}, employeeId ${sortOrder.toUpperCase()}`;
        break;
      case 'conference':
        orderClause = `ORDER BY conferenceCompleted ${sortOrder.toUpperCase()}, employeeId ${sortOrder.toUpperCase()}`;
        break;
      case 'name':
        orderClause = `ORDER BY Employee ${sortOrder.toUpperCase()}`;
        break;
      case 'facility':
        orderClause = `ORDER BY Facility ${sortOrder.toUpperCase()}`;
        break;
      case 'area':
        orderClause = `ORDER BY Area ${sortOrder.toUpperCase()}`;
        break;
      case 'jobTitle':
        orderClause = `ORDER BY staffRoll ${sortOrder.toUpperCase()}`;
        break;
      case 'employeeId':
        orderClause = `ORDER BY employeeNumber ${sortOrder.toUpperCase()}`;
        break;
      case 'latestCompletion': {
        // Build computed latest completion date: Level 1 uses completedDate; others use max of videos/sessions
        const latestExpr = `(CASE WHEN e.awardType = 'Level 1' THEN e.completedDate ELSE (
          SELECT MAX(d) FROM (VALUES (e.standingVideo), (e.sleepingVideo), (e.feedGradVideo), (e.noHandnoSpeak), (e.[session#1]), (e.[session#2]), (e.[session#3])) AS v(d)
        ) END)`;
        // Emulate NULLS LAST for SQL Server
        orderClause = `ORDER BY CASE WHEN ${latestExpr} IS NULL THEN 1 ELSE 0 END, ${latestExpr} ${sortOrder.toUpperCase()}, e.employeeId ${sortOrder.toUpperCase()}`;
        break;
      }
      default:
        orderClause = filters.level === 'Level 1' 
          ? `ORDER BY e.assignedDate ${sortOrder.toUpperCase()}, e.employeeId ${sortOrder.toUpperCase()}`
          : `ORDER BY e.conferenceCompleted ${sortOrder.toUpperCase()}, e.employeeId ${sortOrder.toUpperCase()}`;
    }
    
    query += ` ${orderClause} OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
    
    const result = await request.query(query);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM dbo.SecureCareEmployee e 
    `;
    
    const countRequest = pool.request();
    if (!isAllLevels) {
      countRequest.input('level', sql.VarChar, level);
      countQuery += ` WHERE e.awardType = @level`;
    }
    
    // Handle facility filter - can be string or array
    if (filters.facility && filters.facility !== 'all') {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      if (facilities.length === 1) {
        countQuery += ` ${countQuery.includes('WHERE') ? 'AND' : 'WHERE'} e.facility = @facilityCount0`;
        countRequest.input('facilityCount0', sql.VarChar, facilities[0]);
      } else if (facilities.length > 1) {
        const facilityParams = facilities.map((f, i) => `@facilityCount${i}`).join(', ');
        countQuery += ` ${countQuery.includes('WHERE') ? 'AND' : 'WHERE'} e.facility IN (${facilityParams})`;
        facilities.forEach((f, i) => {
          countRequest.input(`facilityCount${i}`, sql.VarChar, f);
        });
      }
    }
    
    if (filters.area && filters.area !== 'all') {
      countQuery += ` ${countQuery.includes('WHERE') ? 'AND' : 'WHERE'} e.area = @area`;
      countRequest.input('area', sql.VarChar, filters.area);
    }
    
      if (filters.search) {
        countQuery += ` ${countQuery.includes('WHERE') ? 'AND' : 'WHERE'} (e.name LIKE @search OR e.employeeNumber LIKE @search)`;
        countRequest.input('search', sql.VarChar, `%${filters.search}%`);
      }
      
      if (filters.jobTitle && filters.jobTitle !== 'all') {
        countQuery += ` ${countQuery.includes('WHERE') ? 'AND' : 'WHERE'} e.staffRoll = @jobTitle`;
        countRequest.input('jobTitle', sql.VarChar, filters.jobTitle);
      }
      
      // Server-side date filter for count query
      // For training fields, check both completed and scheduled dates
      if (filters.dateField && filters.date) {
        const df = String(filters.dateField);
        const date = filters.date; // YYYY-MM-DD
        const fieldMap = {
          completedDate: 'e.completedDate',
          standingVideo: 'e.standingVideo',
          sleepingVideo: 'e.sleepingVideo',
          feedGradVideo: 'e.feedGradVideo',
          noHandnoSpeak: 'e.noHandnoSpeak',
          session1: 'e.[session#1]',
          session2: 'e.[session#2]',
          session3: 'e.[session#3]',
          conferenceCompleted: 'e.conferenceCompleted',
          secureCareAwardedDate: 'e.secureCareAwardedDate',
          scheduleStandingVideo: 'e.scheduleStandingVideo',
          scheduleSleepingVideo: 'e.scheduleSleepingVideo',
          scheduleFeedGradVideo: 'e.scheduleFeedGradVideo',
          schedulenoHandnoSpeak: 'e.schedulenoHandnoSpeak',
          scheduleSession1: 'e.[scheduleSession#1]',
          scheduleSession2: 'e.[scheduleSession#2]',
          scheduleSession3: 'e.[scheduleSession#3]'
        };
        
        // Map training fields to their scheduled counterparts
        const scheduleFieldMap = {
          'standingVideo': 'scheduleStandingVideo',
          'sleepingVideo': 'scheduleSleepingVideo',
          'feedGradVideo': 'scheduleFeedGradVideo',
          'noHandnoSpeak': 'schedulenoHandnoSpeak',
          'session1': 'scheduleSession1',
          'session2': 'scheduleSession2',
          'session3': 'scheduleSession3'
        };
        
        const column = fieldMap[df];
        const scheduleColumn = scheduleFieldMap[df] ? fieldMap[scheduleFieldMap[df]] : null;
        
        if (column) {
          // For training fields that have both completed and scheduled versions, check both
          if (scheduleColumn) {
            // Use ISNULL to handle NULL values properly - check if either field matches the date
            countQuery += ` ${countQuery.includes('WHERE') ? 'AND' : 'WHERE'} (
              (${column} IS NOT NULL AND CAST(${column} AS DATE) = @filterDateCount) OR 
              (${scheduleColumn} IS NOT NULL AND CAST(${scheduleColumn} AS DATE) = @filterDateCount)
            )`;
          } else {
            // For fields without scheduled versions (like conferenceCompleted, secureCareAwardedDate), only check the one field
            countQuery += ` ${countQuery.includes('WHERE') ? 'AND' : 'WHERE'} ${column} IS NOT NULL AND CAST(${column} AS DATE) = @filterDateCount`;
          }
          countRequest.input('filterDateCount', sql.Date, date);
        }
      }

      // Status filter for count query
      if (filters.status && filters.status !== 'all') {
        let statusCondition = '';
        switch (filters.status) {
        case 'Level 1 In Progress':
          statusCondition = `(e.awardType = 'Level 1' AND e.assignedDate IS NOT NULL AND (e.secureCareAwarded IS NULL OR e.secureCareAwarded = 0))`;
          break;
          case 'Level 1 Completed':
            statusCondition = `(e.awardType = 'Level 1' AND e.secureCareAwarded = 1)`;
            break;
        case 'Level 2 In Progress':
          statusCondition = `(e.awardType = 'Level 2' AND e.conferenceCompleted IS NOT NULL AND e.conferenceCompleted != '' AND e.awaiting = 0 AND (e.secureCareAwarded IS NULL OR e.secureCareAwarded = 0))`;
          break;
          case 'Level 2 Completed':
            statusCondition = `(e.awardType = 'Level 2' AND e.secureCareAwarded = 1)`;
            break;
        case 'Level 3 In Progress':
          statusCondition = `(e.awardType = 'Level 3' AND e.conferenceCompleted IS NOT NULL AND e.conferenceCompleted != '' AND e.awaiting = 0 AND (e.secureCareAwarded IS NULL OR e.secureCareAwarded = 0))`;
          break;
          case 'Level 3 Completed':
            statusCondition = `(e.awardType = 'Level 3' AND e.secureCareAwarded = 1)`;
            break;
        case 'Consultant In Progress':
          statusCondition = `(e.awardType = 'Consultant' AND e.conferenceCompleted IS NOT NULL AND e.conferenceCompleted != '' AND e.awaiting = 0 AND (e.secureCareAwarded IS NULL OR e.secureCareAwarded = 0))`;
          break;
          case 'Consultant Completed':
            statusCondition = `(e.awardType = 'Consultant' AND e.secureCareAwarded = 1)`;
            break;
        case 'Coach In Progress':
          statusCondition = `(e.awardType = 'Coach' AND e.conferenceCompleted IS NOT NULL AND e.conferenceCompleted != '' AND e.awaiting = 0 AND (e.secureCareAwarded IS NULL OR e.secureCareAwarded = 0))`;
          break;
          case 'Coach Completed':
            statusCondition = `(e.awardType = 'Coach' AND e.secureCareAwarded = 1)`;
            break;
          case 'Awaiting Approval':
            statusCondition = `(e.conferenceCompleted IS NOT NULL AND e.conferenceCompleted != '' AND e.awaiting = 1)`;
            break;
          case 'Rejected Approval':
            statusCondition = `(e.conferenceCompleted IS NOT NULL AND e.conferenceCompleted != '' AND e.awaiting IS NULL)`;
            break;
        }
        if (statusCondition) {
          countQuery += ` ${countQuery.includes('WHERE') ? 'AND' : 'WHERE'} ${statusCondition}`;
        }
      }
      
      const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;
    
    return {
      employees: result.recordset,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalEmployees: total,
        itemsPerPage: limit
      }
    };
  }
  
  // Approve conference - simplified without stored procedure
  async approveConference(employeeId) {
    const pool = await getPool();
    const request = pool.request();
    request.input('employeeId', sql.Int, employeeId);
    
    const result = await request.query(`
      UPDATE dbo.SecureCareEmployee 
      SET awaiting = 0 
      WHERE employeeId = @employeeId
    `);
    
    if (result.rowsAffected[0] === 0) {
      throw new Error('Employee not found');
    }
    
    return { success: true, message: 'Conference approved successfully' };
  }
  
  // Reject conference - set awaiting to NULL (rejected state)
  async rejectConference(employeeId) {
    const pool = await getPool();
    const request = pool.request();
    request.input('employeeId', sql.Int, employeeId);
    
    const result = await request.query(`
      UPDATE dbo.SecureCareEmployee 
      SET awaiting = NULL 
      WHERE employeeId = @employeeId
    `);
    
    if (result.rowsAffected[0] === 0) {
      throw new Error('Employee not found');
    }
    
    return { success: true, message: 'Conference rejected successfully' };
  }
  
  // Schedule training item - simplified without stored procedure
  async scheduleTraining(employeeId, columnName, date) {
    const pool = await getPool();
    
    // Whitelist allowed column names to prevent SQL injection
    const allowedColumns = [
      'scheduleStandingVideo',
      'scheduleSleepingVideo', 
      'scheduleFeedGradVideo',
      'schedulenoHandnoSpeak',
      'scheduleSession#1',
      'scheduleSession#2', 
      'scheduleSession#3'
    ];
    
    if (!allowedColumns.includes(columnName)) {
      throw new Error('Invalid column name specified for scheduling');
    }
    
    // Build safe dynamic SQL with explicit date casting to avoid timezone issues
    const sql_query = `UPDATE dbo.SecureCareEmployee SET [${columnName}] = CAST(@date AS DATE) WHERE employeeId = @employeeId`;
    
    const request = pool.request();
    request.input('employeeId', sql.Int, employeeId);
    // Use the date string directly to avoid timezone conversion issues
    request.input('date', sql.VarChar, date);
    
    const result = await request.query(sql_query);
    
    if (result.rowsAffected[0] === 0) {
      throw new Error('Employee not found');
    }
    
    return { success: true, message: 'Training scheduled successfully' };
  }
  
  // Edit completed date: update schedule column and clear actual column (set to NULL)
  // This allows editing a completed date by pushing it back to scheduled state
  async editCompletedDate(employeeId, scheduleColumn, completeColumn, date) {
    const pool = await getPool();
    
    // Whitelist allowed columns
    const allowedScheduleColumns = [
      'scheduleStandingVideo',
      'scheduleSleepingVideo',
      'scheduleFeedGradVideo',
      'schedulenoHandnoSpeak',
      'scheduleSession#1',
      'scheduleSession#2',
      'scheduleSession#3'
    ];
    
    const allowedCompleteColumns = [
      'standingVideo',
      'sleepingVideo',
      'feedGradVideo',
      'noHandnoSpeak',
      'session#1',
      'session#2',
      'session#3'
    ];
    
    if (!allowedScheduleColumns.includes(scheduleColumn) || !allowedCompleteColumns.includes(completeColumn)) {
      throw new Error('Invalid column names specified');
    }
    
    // Update both columns in a single transaction
    const request = pool.request();
    request.input('employeeId', sql.Int, employeeId);
    request.input('scheduleDate', sql.VarChar, date);
    
    const updateResult = await request.query(`
      UPDATE dbo.SecureCareEmployee 
      SET [${scheduleColumn}] = CAST(@scheduleDate AS DATE),
          [${completeColumn}] = NULL
      WHERE employeeId = @employeeId
    `);
    
    if (updateResult.rowsAffected[0] === 0) {
      throw new Error('Employee not found');
    }
    
    return { success: true, message: 'Date updated successfully' };
  }
  
  // Mark training as complete - simplified without stored procedure
  async completeTraining(employeeId, scheduleColumn, completeColumn) {
    const pool = await getPool();
    
    // Whitelist allowed columns
    const allowedScheduleColumns = [
      'scheduleStandingVideo',
      'scheduleSleepingVideo',
      'scheduleFeedGradVideo', 
      'schedulenoHandnoSpeak',
      'scheduleSession#1',
      'scheduleSession#2',
      'scheduleSession#3'
    ];
    
    const allowedCompleteColumns = [
      'standingVideo',
      'sleepingVideo',
      'feedGradVideo',
      'noHandnoSpeak',
      'session#1',
      'session#2',
      'session#3'
    ];
    
    if (!allowedScheduleColumns.includes(scheduleColumn) || !allowedCompleteColumns.includes(completeColumn)) {
      throw new Error('Invalid column names specified');
    }
    
    // First get the scheduled date
    const getScheduleRequest = pool.request();
    getScheduleRequest.input('employeeId', sql.Int, employeeId);
    
    const getScheduleResult = await getScheduleRequest.query(`
      SELECT [${scheduleColumn}] as scheduledDate 
      FROM dbo.SecureCareEmployee 
      WHERE employeeId = @employeeId
    `);
    
    if (getScheduleResult.recordset.length === 0) {
      throw new Error('Employee not found');
    }
    
    const scheduledDate = getScheduleResult.recordset[0].scheduledDate;
    if (!scheduledDate) {
      throw new Error('No scheduled date found for this training item');
    }
    
    // Update the completion column with the scheduled date
    const updateRequest = pool.request();
    updateRequest.input('employeeId', sql.Int, employeeId);
    updateRequest.input('completionDate', sql.Date, scheduledDate);
    
    const updateResult = await updateRequest.query(`
      UPDATE dbo.SecureCareEmployee 
      SET [${completeColumn}] = @completionDate 
      WHERE employeeId = @employeeId
    `);
    
    return { success: true, message: 'Training marked as complete' };
  }
  
  // Get all advisors
  async getAdvisors() {
    const pool = await getPool();
    const request = pool.request();
    
    const result = await request.query(`
      SELECT 
        advisorId,
        firstName,
        lastName,
        firstName + ' ' + ISNULL(lastName, '') as fullName
      FROM dbo.Advisor
      ORDER BY lastName, firstName
    `);
    
    return result.recordset;
  }

  // Add new advisor
  async addAdvisor(firstName, lastName) {
    const pool = await getPool();
    const request = pool.request();
    request.input('firstName', sql.NVarChar, firstName);
    request.input('lastName', sql.NVarChar, lastName);
    
    const result = await request.query(`
      INSERT INTO dbo.Advisor (firstName, lastName)
      OUTPUT INSERTED.advisorId, INSERTED.firstName, INSERTED.lastName, 
             INSERTED.firstName + ' ' + ISNULL(INSERTED.lastName, '') as fullName
      VALUES (@firstName, @lastName)
    `);
    
    if (result.recordset.length === 0) {
      throw new Error('Failed to create advisor');
    }
    
    return result.recordset[0];
  }
  
  // Update employee notes
  async updateEmployeeNotes(employeeId, notes) {
    const pool = await getPool();
    const request = pool.request();
    request.input('employeeId', sql.Int, employeeId);
    request.input('notes', sql.VarChar, notes || null);
    
    const result = await request.query(`
      UPDATE dbo.SecureCareEmployee 
      SET notes = @notes 
      WHERE employeeId = @employeeId
    `);
    
    if (result.rowsAffected[0] === 0) {
      throw new Error('Employee not found');
    }
    
    return { success: true, message: 'Notes updated successfully' };
  }

  // Update employee advisor
  async updateEmployeeAdvisor(employeeId, advisorId) {
    const pool = await getPool();
    const request = pool.request();
    request.input('employeeId', sql.Int, employeeId);
    request.input('advisorId', sql.Int, advisorId || null);
    
    const result = await request.query(`
      UPDATE dbo.SecureCareEmployee 
      SET advisorId = @advisorId 
      WHERE employeeId = @employeeId
    `);
    
    if (result.rowsAffected[0] === 0) {
      throw new Error('Employee not found');
    }
    
    return { success: true, message: 'Advisor updated successfully' };
  }

  // Update employee notes for specific level/awardType
  async updateEmployeeNotesForLevel(employeeId, awardType, notes) {
    const pool = await getPool();
    const request = pool.request();
    request.input('employeeId', sql.Int, employeeId);
    request.input('awardType', sql.VarChar, awardType);
    request.input('notes', sql.VarChar, notes || null);
    
    const result = await request.query(`
      UPDATE dbo.SecureCareEmployee 
      SET notes = @notes 
      WHERE employeeId = @employeeId AND awardType = @awardType
    `);
    
    if (result.rowsAffected[0] === 0) {
      throw new Error('Employee level record not found');
    }
    
    return { success: true, message: `Notes updated successfully for ${awardType}` };
  }

  // Update employee advisor for specific level/awardType
  async updateEmployeeAdvisorForLevel(employeeId, awardType, advisorId) {
    const pool = await getPool();
    const request = pool.request();
    request.input('employeeId', sql.Int, employeeId);
    request.input('awardType', sql.VarChar, awardType);
    request.input('advisorId', sql.Int, advisorId || null);
    
    const result = await request.query(`
      UPDATE dbo.SecureCareEmployee 
      SET advisorId = @advisorId 
      WHERE employeeId = @employeeId AND awardType = @awardType
    `);
    
    if (result.rowsAffected[0] === 0) {
      throw new Error('Employee level record not found');
    }
    
    return { success: true, message: `Advisor updated successfully for ${awardType}` };
  }

  // Get employee by ID
  async getEmployeeById(employeeId) {
    const pool = await getPool();
    const request = pool.request();
    request.input('employeeId', sql.Int, employeeId);
    
    const result = await request.query(`
      SELECT 
        e.employeeId,
        e.employeeNumber,
        e.name,
        e.facility,
        e.area,
        e.staffRoll,
        e.awardType,
        CONVERT(varchar(10), e.assignedDate, 120) AS assignedDate,
        CONVERT(varchar(10), e.completedDate, 120) AS completedDate,
        CONVERT(varchar(10), e.conferenceCompleted, 120) AS conferenceCompleted,
        CONVERT(varchar(10), e.scheduleStandingVideo, 120) AS scheduleStandingVideo,
        CONVERT(varchar(10), e.standingVideo, 120) AS standingVideo,
        CONVERT(varchar(10), e.scheduleSleepingVideo, 120) AS scheduleSleepingVideo,
        CONVERT(varchar(10), e.sleepingVideo, 120) AS sleepingVideo,
        CONVERT(varchar(10), e.scheduleFeedGradVideo, 120) AS scheduleFeedGradVideo,
        CONVERT(varchar(10), e.feedGradVideo, 120) AS feedGradVideo,
        CONVERT(varchar(10), e.schedulenoHandnoSpeak, 120) AS schedulenoHandnoSpeak,
        CONVERT(varchar(10), e.noHandnoSpeak, 120) AS noHandnoSpeak,
        CONVERT(varchar(10), e.[scheduleSession#1], 120) AS scheduleSession1,
        CONVERT(varchar(10), e.[session#1], 120) AS session1,
        CONVERT(varchar(10), e.[scheduleSession#2], 120) AS scheduleSession2,
        CONVERT(varchar(10), e.[session#2], 120) AS session2,
        CONVERT(varchar(10), e.[scheduleSession#3], 120) AS scheduleSession3,
        CONVERT(varchar(10), e.[session#3], 120) AS session3,
        e.secureCareAwarded,
        CONVERT(varchar(10), e.secureCareAwardedDate, 120) AS secureCareAwardedDate,
        e.awaiting,
        e.notes,
        e.advisorId,
        a.firstName + ' ' + ISNULL(a.lastName, '') as advisorName
      FROM dbo.SecureCareEmployee e
      LEFT JOIN dbo.Advisor a ON e.advisorId = a.advisorId
      WHERE e.employeeId = @employeeId
    `);
    
    if (result.recordset.length === 0) {
      throw new Error('Employee not found');
    }
    
    return result.recordset[0];
  }

  // Get unique employees with their highest completed or in-progress status
  async getUniqueEmployeesByLevel(level, filters = {}) {
    const pool = await getPool();
    
    // If status filter is applied, use direct query without deduplication
    // This ensures we get the specific records that match the status filter
    if (filters.status && filters.status !== 'all') {
      const request = pool.request();
      
    let query = `
      SELECT 
        e.employeeId,
        e.employeeNumber,
        e.name AS Employee,
        e.facility AS Facility,
        e.area AS Area,
        e.staffRoll,
        e.awardType,
        CONVERT(varchar(10), e.assignedDate, 120) AS assignedDate,
        CONVERT(varchar(10), e.completedDate, 120) AS completedDate,
        CONVERT(varchar(10), e.conferenceCompleted, 120) AS conferenceCompleted,
        CONVERT(varchar(10), e.scheduleStandingVideo, 120) AS scheduleStandingVideo,
        CONVERT(varchar(10), e.standingVideo, 120) AS standingVideo,
        CONVERT(varchar(10), e.scheduleSleepingVideo, 120) AS scheduleSleepingVideo,
        CONVERT(varchar(10), e.sleepingVideo, 120) AS sleepingVideo,
        CONVERT(varchar(10), e.scheduleFeedGradVideo, 120) AS scheduleFeedGradVideo,
        CONVERT(varchar(10), e.feedGradVideo, 120) AS feedGradVideo,
        CONVERT(varchar(10), e.schedulenoHandnoSpeak, 120) AS schedulenoHandnoSpeak,
        CONVERT(varchar(10), e.noHandnoSpeak, 120) AS noHandnoSpeak,
        CONVERT(varchar(10), e.[scheduleSession#1], 120) AS scheduleSession1,
        CONVERT(varchar(10), e.[session#1], 120) AS session1,
        CONVERT(varchar(10), e.[scheduleSession#2], 120) AS scheduleSession2,
        CONVERT(varchar(10), e.[session#2], 120) AS session2,
        CONVERT(varchar(10), e.[scheduleSession#3], 120) AS scheduleSession3,
        CONVERT(varchar(10), e.[session#3], 120) AS session3,
        e.secureCareAwarded,
        CONVERT(varchar(10), e.secureCareAwardedDate, 120) AS secureCareAwardedDate,
        e.awaiting,
        e.notes,
        e.advisorId,
        a.firstName + ' ' + ISNULL(a.lastName, '') as advisorName
      FROM dbo.SecureCareEmployee e
      LEFT JOIN dbo.Advisor a ON e.advisorId = a.advisorId
        WHERE 1=1
      `;
    
    // Apply level filter unless requesting all levels
    const isAllLevels = !level || level.toLowerCase() === 'all' || level.toLowerCase() === 'all levels';
    if (!isAllLevels) {
      query += ` AND e.awardType = @level`;
      request.input('level', sql.VarChar, level);
    }
    
    // Apply additional filters
    // Handle facility filter - can be string or array
    if (filters.facility && filters.facility !== 'all') {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      if (facilities.length === 1) {
        query += ` AND e.facility = @facility0`;
        request.input('facility0', sql.VarChar, facilities[0]);
      } else if (facilities.length > 1) {
        const facilityParams = facilities.map((f, i) => `@facility${i}`).join(', ');
        query += ` AND e.facility IN (${facilityParams})`;
        facilities.forEach((f, i) => {
          request.input(`facility${i}`, sql.VarChar, f);
        });
      }
    }
    
    if (filters.area && filters.area !== 'all') {
      query += ` AND e.area = @area`;
      request.input('area', sql.VarChar, filters.area);
    }
    
      if (filters.search) {
        query += ` AND (e.name LIKE @search OR e.employeeNumber LIKE @search)`;
        request.input('search', sql.VarChar, `%${filters.search}%`);
      }
      
      if (filters.jobTitle && filters.jobTitle !== 'all') {
        query += ` AND e.staffRoll = @jobTitle`;
        request.input('jobTitle', sql.VarChar, filters.jobTitle);
      }
      
      // Status filter - this is complex as it depends on awardType and completion status
        let statusCondition = '';
        switch (filters.status) {
        case 'Awaiting Approval':
          statusCondition = `(e.conferenceCompleted IS NOT NULL AND e.conferenceCompleted != '' AND e.awaiting = 1)`;
            break;
        case 'Rejected Approval':
          statusCondition = `(e.conferenceCompleted IS NOT NULL AND e.conferenceCompleted != '' AND e.awaiting IS NULL)`;
            break;
        case 'Level 1 Completed':
            statusCondition = `(e.awardType = 'Level 1' AND e.secureCareAwarded = 1)`;
            break;
        case 'Level 1 In Progress':
          statusCondition = `(e.awardType = 'Level 1' AND e.assignedDate IS NOT NULL AND (e.secureCareAwarded IS NULL OR e.secureCareAwarded = 0))`;
          break;
        case 'Level 2 Completed':
            statusCondition = `(e.awardType = 'Level 2' AND e.secureCareAwarded = 1)`;
            break;
        case 'Level 2 In Progress':
          statusCondition = `(e.awardType = 'Level 2' AND e.conferenceCompleted IS NOT NULL AND e.conferenceCompleted != '' AND e.awaiting = 0 AND (e.secureCareAwarded IS NULL OR e.secureCareAwarded = 0))`;
          break;
        case 'Level 3 Completed':
            statusCondition = `(e.awardType = 'Level 3' AND e.secureCareAwarded = 1)`;
            break;
        case 'Level 3 In Progress':
          statusCondition = `(e.awardType = 'Level 3' AND e.conferenceCompleted IS NOT NULL AND e.conferenceCompleted != '' AND e.awaiting = 0 AND (e.secureCareAwarded IS NULL OR e.secureCareAwarded = 0))`;
          break;
        case 'Consultant Completed':
            statusCondition = `(e.awardType = 'Consultant' AND e.secureCareAwarded = 1)`;
            break;
        case 'Consultant In Progress':
          statusCondition = `(e.awardType = 'Consultant' AND e.conferenceCompleted IS NOT NULL AND e.conferenceCompleted != '' AND e.awaiting = 0 AND (e.secureCareAwarded IS NULL OR e.secureCareAwarded = 0))`;
          break;
        case 'Coach Completed':
            statusCondition = `(e.awardType = 'Coach' AND e.secureCareAwarded = 1)`;
            break;
        case 'Coach In Progress':
          statusCondition = `(e.awardType = 'Coach' AND e.conferenceCompleted IS NOT NULL AND e.conferenceCompleted != '' AND e.awaiting = 0 AND (e.secureCareAwarded IS NULL OR e.secureCareAwarded = 0))`;
          break;
        }
      
        if (statusCondition) {
          query += ` AND ${statusCondition}`;
      }
      
      // Add pagination
    const page = parseInt(filters.page) || 1;
    const requestedLimit = parseInt(filters.limit) || 50;
    // Allow larger limits for dashboard (up to 10,000) but cap at 100 for regular pagination
    const limit = requestedLimit > 100 ? Math.min(requestedLimit, 10000) : Math.min(requestedLimit, 100);
    const offset = (page - 1) * limit;
    
      // Add sorting support - default to name sorting
      const sortBy = filters.sortBy || 'name';
      const sortOrder = normalizeSortOrder(filters.sortOrder);
    
    let orderClause = '';
    switch (sortBy) {
      case 'latest':
          orderClause = `ORDER BY assignedDate ${sortOrder.toUpperCase()}, employeeId ${sortOrder.toUpperCase()}`;
        break;
      case 'conference':
          orderClause = `ORDER BY conferenceCompleted ${sortOrder.toUpperCase()}, employeeId ${sortOrder.toUpperCase()}`;
        break;
      case 'name':
          orderClause = `ORDER BY Employee ${sortOrder.toUpperCase()}`;
        break;
      case 'facility':
          orderClause = `ORDER BY Facility ${sortOrder.toUpperCase()}`;
          break;
        case 'area':
          orderClause = `ORDER BY Area ${sortOrder.toUpperCase()}`;
          break;
        case 'jobTitle':
          orderClause = `ORDER BY staffRoll ${sortOrder.toUpperCase()}`;
          break;
        case 'employeeId':
          orderClause = `ORDER BY employeeNumber ${sortOrder.toUpperCase()}`;
        break;
      default:
        orderClause = filters.level === 'Level 1' 
            ? `ORDER BY e.assignedDate ${sortOrder.toUpperCase()}, e.employeeId ${sortOrder.toUpperCase()}`
            : `ORDER BY e.conferenceCompleted ${sortOrder.toUpperCase()}, e.employeeId ${sortOrder.toUpperCase()}`;
    }
    
    query += ` ${orderClause} OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
    
    const result = await request.query(query);
    
      // Get total count for status-filtered results
    let countQuery = `
        SELECT COUNT(*) as total 
      FROM dbo.SecureCareEmployee e
        WHERE 1=1
      `;
      
      // Apply the same filters to count query
      if (!isAllLevels) {
        countQuery += ` AND e.awardType = @level`;
      }
      // Handle facility filter - can be string or array (uses same request params)
      if (filters.facility && filters.facility !== 'all') {
        const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
        if (facilities.length === 1) {
          countQuery += ` AND e.facility = @facility0`;
        } else if (facilities.length > 1) {
          const facilityParams = facilities.map((f, i) => `@facility${i}`).join(', ');
          countQuery += ` AND e.facility IN (${facilityParams})`;
        }
      }
      if (filters.area && filters.area !== 'all') {
        countQuery += ` AND e.area = @area`;
      }
      if (filters.search) {
        countQuery += ` AND (e.name LIKE @search OR e.employeeNumber LIKE @search)`;
      }
      if (filters.jobTitle && filters.jobTitle !== 'all') {
        countQuery += ` AND e.staffRoll = @jobTitle`;
      }
      if (statusCondition) {
        countQuery += ` AND ${statusCondition}`;
      }
      
      const countResult = await request.query(countQuery);
      
      return {
        employees: result.recordset,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(countResult.recordset[0].total / limit),
          totalEmployees: countResult.recordset[0].total,
          pageSize: limit
        }
      };
    }
    
    // For non-status filtering, use the deduplication approach with CTE
    let query = `
      WITH RankedEmployees AS (
        SELECT 
          e.employeeId,
          e.employeeNumber,
          e.name AS Employee,
          e.facility AS Facility,
          e.area AS Area,
          e.staffRoll,
          e.awardType,
          CONVERT(varchar(10), e.assignedDate, 120) AS assignedDate,
          CONVERT(varchar(10), e.completedDate, 120) AS completedDate,
          CONVERT(varchar(10), e.conferenceCompleted, 120) AS conferenceCompleted,
          CONVERT(varchar(10), e.scheduleStandingVideo, 120) AS scheduleStandingVideo,
          CONVERT(varchar(10), e.standingVideo, 120) AS standingVideo,
          CONVERT(varchar(10), e.scheduleSleepingVideo, 120) AS scheduleSleepingVideo,
          CONVERT(varchar(10), e.sleepingVideo, 120) AS sleepingVideo,
          CONVERT(varchar(10), e.scheduleFeedGradVideo, 120) AS scheduleFeedGradVideo,
          CONVERT(varchar(10), e.feedGradVideo, 120) AS feedGradVideo,
          CONVERT(varchar(10), e.schedulenoHandnoSpeak, 120) AS schedulenoHandnoSpeak,
          CONVERT(varchar(10), e.noHandnoSpeak, 120) AS noHandnoSpeak,
          CONVERT(varchar(10), e.[scheduleSession#1], 120) AS scheduleSession1,
          CONVERT(varchar(10), e.[session#1], 120) AS session1,
          CONVERT(varchar(10), e.[scheduleSession#2], 120) AS scheduleSession2,
          CONVERT(varchar(10), e.[session#2], 120) AS session2,
          CONVERT(varchar(10), e.[scheduleSession#3], 120) AS scheduleSession3,
          CONVERT(varchar(10), e.[session#3], 120) AS session3,
          e.secureCareAwarded,
          CONVERT(varchar(10), e.secureCareAwardedDate, 120) AS secureCareAwardedDate,
          e.awaiting,
          e.notes,
          e.advisorId,
          a.firstName + ' ' + ISNULL(a.lastName, '') as advisorName,
          ROW_NUMBER() OVER (
            PARTITION BY e.employeeNumber 
        ORDER BY 
          CASE 
                WHEN e.awardType = 'Coach' THEN 1
                WHEN e.awardType = 'Consultant' THEN 2
                WHEN e.awardType = 'Level 3' THEN 3
                WHEN e.awardType = 'Level 2' THEN 4
                WHEN e.awardType = 'Level 1' THEN 5
            ELSE 99
          END,
              e.employeeId
          ) as rn
        FROM dbo.SecureCareEmployee e
        LEFT JOIN dbo.Advisor a ON e.advisorId = a.advisorId
        WHERE 1=1
      )
      SELECT 
        employeeId,
        employeeNumber,
        Employee,
        Facility,
        Area,
        staffRoll,
        awardType,
        assignedDate,
        completedDate,
        conferenceCompleted,
        scheduleStandingVideo,
        standingVideo,
        scheduleSleepingVideo,
        sleepingVideo,
        scheduleFeedGradVideo,
        feedGradVideo,
        schedulenoHandnoSpeak,
        noHandnoSpeak,
        scheduleSession1,
        session1,
        scheduleSession2,
        session2,
        scheduleSession3,
        session3,
        secureCareAwarded,
        secureCareAwardedDate,
        awaiting,
        notes,
        advisorId,
        advisorName
      FROM RankedEmployees
      WHERE rn = 1
    `;
    
    const request = pool.request();
    
    // Apply level filter unless requesting all levels
    const isAllLevels = !level || level.toLowerCase() === 'all' || level.toLowerCase() === 'all levels';
    if (!isAllLevels) {
      request.input('level', sql.VarChar, level);
      query = query.replace('WHERE 1=1', 'WHERE 1=1 AND e.awardType = @level');
    }
    
    // Apply additional filters within the CTE
    // Handle facility filter - can be string or array
    if (filters.facility && filters.facility !== 'all') {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      if (facilities.length === 1) {
        request.input('facility0', sql.VarChar, facilities[0]);
        query = query.replace('WHERE 1=1', 'WHERE 1=1 AND e.facility = @facility0');
      } else if (facilities.length > 1) {
        const facilityParams = facilities.map((f, i) => `@facility${i}`).join(', ');
        facilities.forEach((f, i) => {
          request.input(`facility${i}`, sql.VarChar, f);
        });
        query = query.replace('WHERE 1=1', `WHERE 1=1 AND e.facility IN (${facilityParams})`);
      }
    }
    
    if (filters.area && filters.area !== 'all') {
      request.input('area', sql.VarChar, filters.area);
      query = query.replace('WHERE 1=1', 'WHERE 1=1 AND e.area = @area');
    }
    
      if (filters.search) {
      request.input('search', sql.VarChar, `%${filters.search}%`);
      query = query.replace('WHERE 1=1', 'WHERE 1=1 AND (e.name LIKE @search OR e.employeeNumber LIKE @search)');
      }
      
      if (filters.jobTitle && filters.jobTitle !== 'all') {
      request.input('jobTitle', sql.VarChar, filters.jobTitle);
      query = query.replace('WHERE 1=1', 'WHERE 1=1 AND e.staffRoll = @jobTitle');
    }
      
      
      // Add pagination
    const page = parseInt(filters.page) || 1;
    const requestedLimit = parseInt(filters.limit) || 50;
    // Allow larger limits for dashboard (up to 10,000) but cap at 100 for regular pagination
    const limit = requestedLimit > 100 ? Math.min(requestedLimit, 10000) : Math.min(requestedLimit, 100);
    const offset = (page - 1) * limit;
    
    // Add sorting support - default to name sorting
    const sortBy = filters.sortBy || 'name';
    const sortOrder = normalizeSortOrder(filters.sortOrder);
    
    let orderClause = '';
    switch (sortBy) {
      case 'latest':
        orderClause = `ORDER BY assignedDate ${sortOrder.toUpperCase()}, employeeId ${sortOrder.toUpperCase()}`;
            break;
      case 'conference':
        orderClause = `ORDER BY conferenceCompleted ${sortOrder.toUpperCase()}, employeeId ${sortOrder.toUpperCase()}`;
            break;
      case 'name':
        orderClause = `ORDER BY Employee ${sortOrder.toUpperCase()}`;
            break;
      case 'facility':
        orderClause = `ORDER BY Facility ${sortOrder.toUpperCase()}`;
            break;
      case 'area':
        orderClause = `ORDER BY Area ${sortOrder.toUpperCase()}`;
            break;
      case 'jobTitle':
        orderClause = `ORDER BY staffRoll ${sortOrder.toUpperCase()}`;
            break;
      case 'employeeId':
        orderClause = `ORDER BY employeeNumber ${sortOrder.toUpperCase()}`;
            break;
      default:
        orderClause = filters.level === 'Level 1' 
          ? `ORDER BY e.assignedDate ${sortOrder.toUpperCase()}, e.employeeId ${sortOrder.toUpperCase()}`
          : `ORDER BY e.conferenceCompleted ${sortOrder.toUpperCase()}, e.employeeId ${sortOrder.toUpperCase()}`;
    }
    
    query += ` ${orderClause} OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
    
    const result = await request.query(query);
    
    // Get total count for unique employees using CTE
    let countQuery = `
      WITH RankedEmployees AS (
        SELECT 
          e.employeeNumber,
          e.awardType,
          e.facility,
          e.area,
          e.name,
          e.staffRoll,
          ROW_NUMBER() OVER (
            PARTITION BY e.employeeNumber 
            ORDER BY 
              CASE 
                WHEN e.awardType = 'Coach' THEN 1
                WHEN e.awardType = 'Consultant' THEN 2
                WHEN e.awardType = 'Level 3' THEN 3
                WHEN e.awardType = 'Level 2' THEN 4
                WHEN e.awardType = 'Level 1' THEN 5
                ELSE 99
              END,
              e.employeeId
          ) as rn
        FROM dbo.SecureCareEmployee e
        WHERE 1=1
    `;
    
    const countRequest = pool.request();
    
    // Apply filters within the CTE
    if (!isAllLevels) {
      countRequest.input('level', sql.VarChar, level);
      countQuery += ` AND e.awardType = @level`;
    }
    
    // Handle facility filter - can be string or array
    if (filters.facility && filters.facility !== 'all') {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      if (facilities.length === 1) {
        countRequest.input('facility0', sql.VarChar, facilities[0]);
        countQuery += ` AND e.facility = @facility0`;
      } else if (facilities.length > 1) {
        const facilityParams = facilities.map((f, i) => `@facility${i}`).join(', ');
        facilities.forEach((f, i) => {
          countRequest.input(`facility${i}`, sql.VarChar, f);
        });
        countQuery += ` AND e.facility IN (${facilityParams})`;
      }
    }
    
    if (filters.area && filters.area !== 'all') {
      countRequest.input('area', sql.VarChar, filters.area);
      countQuery += ` AND e.area = @area`;
    }
    
    if (filters.search) {
      countRequest.input('search', sql.VarChar, `%${filters.search}%`);
      countQuery += ` AND (e.name LIKE @search OR e.employeeNumber LIKE @search)`;
    }
    
    if (filters.jobTitle && filters.jobTitle !== 'all') {
      countRequest.input('jobTitle', sql.VarChar, filters.jobTitle);
      countQuery += ` AND e.staffRoll = @jobTitle`;
    }
    
    countQuery += `
      )
      SELECT COUNT(*) as total 
      FROM RankedEmployees
      WHERE rn = 1
    `;
      
      
      const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;
    
    // Debug logging for Sophia Allen
    const sophiaAllen = result.recordset.find(emp => 
      emp.Employee === 'Sophia Allen' || emp.name === 'Sophia Allen'
    );
    if (sophiaAllen) {
      // Debug logging removed
    }
    
    return {
      employees: result.recordset,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalEmployees: total,
        pageSize: limit
      }
    };
  }

  // Get all awardType records for a given employee based on their employeeNumber
  async getEmployeeLevelsByEmployeeId(employeeId) {
    const pool = await getPool();
    const request = pool.request();
    request.input('employeeId', sql.Int, employeeId);

    // First, find the employeeNumber for the provided employeeId
    const currentResult = await request.query(`
      SELECT employeeNumber FROM dbo.SecureCareEmployee WHERE employeeId = @employeeId
    `);

    if (currentResult.recordset.length === 0) {
      throw new Error('Employee not found');
    }

    const employeeNumber = currentResult.recordset[0].employeeNumber;

    // Now fetch all records with the same employeeNumber (all award types/levels)
    const levelsRequest = pool.request();
    levelsRequest.input('employeeNumber', sql.VarChar(50), employeeNumber);

    const levelsResult = await levelsRequest.query(`
      SELECT 
        e.employeeId,
        e.employeeNumber,
        e.name,
        e.facility,
        e.area,
        e.staffRoll,
        e.awardType,
        CONVERT(varchar(10), e.assignedDate, 120) AS assignedDate,
        CONVERT(varchar(10), e.completedDate, 120) AS completedDate,
        CONVERT(varchar(10), e.conferenceCompleted, 120) AS conferenceCompleted,
        CONVERT(varchar(10), e.scheduleStandingVideo, 120) AS scheduleStandingVideo,
        CONVERT(varchar(10), e.standingVideo, 120) AS standingVideo,
        CONVERT(varchar(10), e.scheduleSleepingVideo, 120) AS scheduleSleepingVideo,
        CONVERT(varchar(10), e.sleepingVideo, 120) AS sleepingVideo,
        CONVERT(varchar(10), e.scheduleFeedGradVideo, 120) AS scheduleFeedGradVideo,
        CONVERT(varchar(10), e.feedGradVideo, 120) AS feedGradVideo,
        CONVERT(varchar(10), e.schedulenoHandnoSpeak, 120) AS schedulenoHandnoSpeak,
        CONVERT(varchar(10), e.noHandnoSpeak, 120) AS noHandnoSpeak,
        CONVERT(varchar(10), e.[scheduleSession#1], 120) AS scheduleSession1,
        CONVERT(varchar(10), e.[session#1], 120) AS session1,
        CONVERT(varchar(10), e.[scheduleSession#2], 120) AS scheduleSession2,
        CONVERT(varchar(10), e.[session#2], 120) AS session2,
        CONVERT(varchar(10), e.[scheduleSession#3], 120) AS scheduleSession3,
        CONVERT(varchar(10), e.[session#3], 120) AS session3,
        e.secureCareAwarded,
        CONVERT(varchar(10), e.secureCareAwardedDate, 120) AS secureCareAwardedDate,
        e.awaiting,
        e.notes,
        e.advisorId,
        a.firstName + ' ' + ISNULL(a.lastName, '') as advisorName
      FROM dbo.SecureCareEmployee e
      LEFT JOIN dbo.Advisor a ON e.advisorId = a.advisorId
      WHERE e.employeeNumber = @employeeNumber
      ORDER BY 
        CASE 
          WHEN e.awardType = 'Level 1' THEN 1
          WHEN e.awardType = 'Level 2' THEN 2
          WHEN e.awardType = 'Level 3' THEN 3
          WHEN e.awardType = 'Consultant' THEN 4
          WHEN e.awardType = 'Coach' THEN 5
          ELSE 99
        END
    `);
    
    return levelsResult.recordset;
  }

  // Get filter options for dropdowns
  async getFilterOptions() {
    const pool = await getPool();
    
    // Get unique facilities
    const facilitiesQuery = `
      SELECT DISTINCT facility 
      FROM dbo.SecureCareEmployee 
      WHERE facility IS NOT NULL AND facility != ''
      ORDER BY facility
    `;
    
    // Get unique areas
    const areasQuery = `
      SELECT DISTINCT area 
      FROM dbo.SecureCareEmployee 
      WHERE area IS NOT NULL AND area != ''
      ORDER BY area
    `;
    
    // Get unique job titles (staffRoll)
    const jobTitlesQuery = `
      SELECT DISTINCT staffRoll 
      FROM dbo.SecureCareEmployee 
      WHERE staffRoll IS NOT NULL AND staffRoll != ''
      ORDER BY staffRoll
    `;
    
    const [facilitiesResult, areasResult, jobTitlesResult] = await Promise.all([
      pool.request().query(facilitiesQuery),
      pool.request().query(areasQuery),
      pool.request().query(jobTitlesQuery)
    ]);
    
    return {
      facilities: facilitiesResult.recordset.map(row => row.facility),
      areas: areasResult.recordset.map(row => row.area),
      jobTitles: jobTitlesResult.recordset.map(row => row.staffRoll)
    };
  }

  // Analytics Methods
  async getAnalyticsOverview(filters = {}) {
    try {
    // Check cache first
    const cacheKey = this.getCacheKey('analyticsOverview', filters);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    const pool = await getPool();
    const request = pool.request();
    
    // Build base query with filters
    let whereClause = '';
    const conditions = [];

    conditions.push('e.awardType IS NOT NULL');
    
    // Handle facility filter - can be string or array
    if (filters.facility && filters.facility !== 'all') {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      if (facilities.length === 1) {
        conditions.push('e.facility = @facility0');
        request.input('facility0', sql.VarChar, facilities[0]);
      } else if (facilities.length > 1) {
        const facilityParams = facilities.map((f, i) => `@facility${i}`).join(', ');
        facilities.forEach((f, i) => {
          request.input(`facility${i}`, sql.VarChar, f);
        });
        conditions.push(`e.facility IN (${facilityParams})`);
      }
    }
    
    if (filters.area && filters.area !== 'all') {
      conditions.push('e.area = @area');
      request.input('area', sql.VarChar, filters.area);
    }
    
    if (filters.level && filters.level !== 'all') {
      conditions.push('e.awardType = @level');
      request.input('level', sql.VarChar, filters.level);
    }
    
    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }
    
    // Build the query with conditional date filtering for completed certifications
    let completedDateFilter = '';
    if (filters.startDate && filters.endDate) {
      completedDateFilter = `AND e.secureCareAwardedDate BETWEEN @startDate AND @endDate`;
      request.input('startDate', sql.Date, filters.startDate);
      request.input('endDate', sql.Date, filters.endDate);
    }
    
    const query = `
      SELECT 
        COUNT(*) as totalEmployees,
        SUM(CASE WHEN e.secureCareAwarded = 1 ${completedDateFilter} THEN 1 ELSE 0 END) as completedCertifications,
        SUM(CASE WHEN e.secureCareAwarded = 0 THEN 1 ELSE 0 END) as inProgress,
        SUM(CASE WHEN e.assignedDate IS NULL THEN 1 ELSE 0 END) as notStarted,
        SUM(CASE WHEN e.awardType = 'Level 1' AND e.secureCareAwarded = 1 ${completedDateFilter} THEN 1 ELSE 0 END) as level1Completed,
        SUM(CASE WHEN e.awardType = 'Level 2' AND e.secureCareAwarded = 1 ${completedDateFilter} THEN 1 ELSE 0 END) as level2Completed,
        SUM(CASE WHEN e.awardType = 'Level 3' AND e.secureCareAwarded = 1 ${completedDateFilter} THEN 1 ELSE 0 END) as level3Completed,
        SUM(CASE WHEN e.awardType = 'Consultant' AND e.secureCareAwarded = 1 ${completedDateFilter} THEN 1 ELSE 0 END) as consultantCompleted,
        SUM(CASE WHEN e.awardType = 'Coach' AND e.secureCareAwarded = 1 ${completedDateFilter} THEN 1 ELSE 0 END) as coachCompleted,
        AVG(CASE 
          WHEN e.assignedDate IS NOT NULL AND e.secureCareAwardedDate IS NOT NULL ${completedDateFilter}
          THEN DATEDIFF(day, e.assignedDate, e.secureCareAwardedDate) 
          ELSE NULL 
        END) as averageCompletionTime
      FROM dbo.SecureCareEmployee e
      ${whereClause}
    `;
    
    const result = await request.query(query);
    
    const overviewData = result.recordset[0];
    
    // Cache the result
    this.setCache(cacheKey, overviewData);
    
    return overviewData;
    } catch (error) {
      console.error('Error in getAnalyticsOverview:', error);
      throw error;
    }
  }

  async getFacilityPerformance(filters = {}) {
    const pool = await getPool();
    const request = pool.request();
    
    let whereClause = '';
    const conditions = [];
    
    if (filters.level && filters.level !== 'all') {
      conditions.push('e.awardType = @level');
      request.input('level', sql.VarChar, filters.level);
    }
    
    if (filters.startDate && filters.endDate) {
      conditions.push('e.secureCareAwardedDate BETWEEN @startDate AND @endDate');
      request.input('startDate', sql.Date, filters.startDate);
      request.input('endDate', sql.Date, filters.endDate);
    }
    
    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }
    
    const query = `
      SELECT 
        e.facility,
        COUNT(*) as total,
        SUM(CASE WHEN e.secureCareAwarded = 1 THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN e.secureCareAwarded = 0 THEN 1 ELSE 0 END) as inProgress,
        AVG(CASE 
          WHEN e.assignedDate IS NOT NULL AND e.secureCareAwardedDate IS NOT NULL 
          THEN DATEDIFF(day, e.assignedDate, e.secureCareAwardedDate) 
          ELSE NULL 
        END) as avgTime
      FROM dbo.SecureCareEmployee e
      ${whereClause}
      GROUP BY e.facility
      HAVING e.facility IS NOT NULL AND e.facility != ''
      ORDER BY 
        CASE WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN e.secureCareAwarded = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) ELSE 0 END DESC
    `;
    
    const result = await request.query(query);
    return result.recordset.map(row => ({
      facility: row.facility,
      total: row.total,
      completed: row.completed,
      inProgress: row.inProgress,
      completionRate: row.total > 0 ? (row.completed / row.total) * 100 : 0,
      avgTime: Math.round(row.avgTime || 0)
    }));
  }

  async getAreaPerformance(filters = {}) {
    const pool = await getPool();
    const request = pool.request();
    
    let whereClause = '';
    const conditions = [];
    
    if (filters.level && filters.level !== 'all') {
      conditions.push('e.awardType = @level');
      request.input('level', sql.VarChar, filters.level);
    }
    
    if (filters.startDate && filters.endDate) {
      conditions.push('e.secureCareAwardedDate BETWEEN @startDate AND @endDate');
      request.input('startDate', sql.Date, filters.startDate);
      request.input('endDate', sql.Date, filters.endDate);
    }
    
    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }
    
    const query = `
      SELECT 
        e.area,
        COUNT(*) as total,
        SUM(CASE WHEN e.secureCareAwarded = 1 THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN e.assignedDate IS NOT NULL AND e.secureCareAwarded = 0 THEN 1 ELSE 0 END) as inProgress
      FROM dbo.SecureCareEmployee e
      ${whereClause}
      GROUP BY e.area
      HAVING e.area IS NOT NULL AND e.area != ''
      ORDER BY 
        CASE WHEN COUNT(*) > 0 THEN (SUM(CASE WHEN e.secureCareAwarded = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) ELSE 0 END DESC
    `;
    
    const result = await request.query(query);
    return result.recordset.map(row => ({
      area: row.area,
      total: row.total,
      completed: row.completed,
      inProgress: row.inProgress,
      completionRate: row.total > 0 ? (row.completed / row.total) * 100 : 0
    }));
  }

  async getMonthlyTrends(filters = {}) {
    try {
      const pool = await getPool();
      const request = pool.request();
      
      let whereClause = '';
      const conditions = [];
      
      // Handle facility filter - can be string or array
      if (filters.facility && filters.facility !== 'all') {
        const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
        if (facilities.length === 1) {
          conditions.push('e.facility = @facility0');
          request.input('facility0', sql.VarChar, facilities[0]);
        } else if (facilities.length > 1) {
          const facilityParams = facilities.map((f, i) => `@facility${i}`).join(', ');
          facilities.forEach((f, i) => {
            request.input(`facility${i}`, sql.VarChar, f);
          });
          conditions.push(`e.facility IN (${facilityParams})`);
        }
      }
      
      if (filters.area && filters.area !== 'all') {
        conditions.push('e.area = @area');
        request.input('area', sql.VarChar, filters.area);
      }
      
      if (filters.level && filters.level !== 'all') {
        conditions.push('e.awardType = @level');
        request.input('level', sql.VarChar, filters.level);
      }
      
      // Add the date conditions to the where clause
      conditions.push('e.secureCareAwardedDate IS NOT NULL');
      conditions.push('e.secureCareAwardedDate >= DATEADD(month, -6, GETDATE())');
      
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
      
      const query = `
        SELECT 
          YEAR(e.secureCareAwardedDate) as year,
          MONTH(e.secureCareAwardedDate) as month,
          COUNT(*) as completed
        FROM dbo.SecureCareEmployee e
        ${whereClause}
        GROUP BY YEAR(e.secureCareAwardedDate), MONTH(e.secureCareAwardedDate)
        ORDER BY year, month
      `;
      
      const completedResult = await request.query(query);
      
      // Query for in-progress data (assigned but not completed)
      const inProgressConditions = [];
      // Handle facility filter for in-progress - reuse same params
      if (filters.facility && filters.facility !== 'all') {
        const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
        if (facilities.length === 1) {
          inProgressConditions.push('e.facility = @facility0');
        } else if (facilities.length > 1) {
          const facilityParams = facilities.map((f, i) => `@facility${i}`).join(', ');
          inProgressConditions.push(`e.facility IN (${facilityParams})`);
        }
      }
      if (filters.area && filters.area !== 'all') {
        inProgressConditions.push('e.area = @area');
      }
      if (filters.level && filters.level !== 'all') {
        inProgressConditions.push('e.awardType = @level');
      }
      
      inProgressConditions.push('e.secureCareAwarded = 0');
      inProgressConditions.push('e.assignedDate >= DATEADD(month, -6, GETDATE())');
      
      const inProgressWhereClause = 'WHERE ' + inProgressConditions.join(' AND ');
      
      const inProgressQuery = `
        SELECT 
          YEAR(e.assignedDate) as year,
          MONTH(e.assignedDate) as month,
          COUNT(*) as inProgress
        FROM dbo.SecureCareEmployee e
        ${inProgressWhereClause}
        GROUP BY YEAR(e.assignedDate), MONTH(e.assignedDate)
        ORDER BY year, month
      `;
      
      const inProgressResult = await request.query(inProgressQuery);
      
      // Generate last 6 months with data
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const trends = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        
        const completedData = completedResult.recordset.find(row => row.year === year && row.month === month);
        const inProgressData = inProgressResult.recordset.find(row => row.year === year && row.month === month);
        
        trends.push({
          month: months[date.getMonth()],
          completed: completedData ? completedData.completed : 0,
          inProgress: inProgressData ? inProgressData.inProgress : 0,
          new: Math.floor((completedData ? completedData.completed : 0) * 0.3) // Estimate new enrollments as 30% of completions
        });
      }
      
      return trends;
    } catch (error) {
      console.error('Error in getMonthlyTrends:', error);
      throw error;
    }
  }

  async getCertificationProgress(filters = {}) {
    const pool = await getPool();
    const request = pool.request();
    
    let whereClause = '';
    const conditions = [];
    
    // Handle facility filter - can be string or array
    if (filters.facility && filters.facility !== 'all') {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      if (facilities.length === 1) {
        conditions.push('e.facility = @facility0');
        request.input('facility0', sql.VarChar, facilities[0]);
      } else if (facilities.length > 1) {
        const facilityParams = facilities.map((f, i) => `@facility${i}`).join(', ');
        facilities.forEach((f, i) => {
          request.input(`facility${i}`, sql.VarChar, f);
        });
        conditions.push(`e.facility IN (${facilityParams})`);
      }
    }
    
    if (filters.area && filters.area !== 'all') {
      conditions.push('e.area = @area');
      request.input('area', sql.VarChar, filters.area);
    }
    
    if (filters.startDate && filters.endDate) {
      conditions.push('e.secureCareAwardedDate BETWEEN @startDate AND @endDate');
      request.input('startDate', sql.Date, filters.startDate);
      request.input('endDate', sql.Date, filters.endDate);
    }
    
    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }
    
    const query = `
      SELECT 
        e.awardType as level,
        COUNT(*) as total,
        SUM(CASE WHEN e.secureCareAwarded = 1 THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN e.secureCareAwarded = 0 THEN 1 ELSE 0 END) as inProgress,
        AVG(CASE 
          WHEN e.assignedDate IS NOT NULL AND e.secureCareAwardedDate IS NOT NULL 
          THEN DATEDIFF(day, e.assignedDate, e.secureCareAwardedDate) 
          ELSE NULL 
        END) as avgTime
      FROM dbo.SecureCareEmployee e
      ${whereClause}
      GROUP BY e.awardType
      ORDER BY 
        CASE e.awardType
          WHEN 'Level 1' THEN 1
          WHEN 'Level 2' THEN 2
          WHEN 'Level 3' THEN 3
          WHEN 'Consultant' THEN 4
          WHEN 'Coach' THEN 5
          ELSE 99
        END
    `;
    
    const result = await request.query(query);
    const totalEmployees = result.recordset.reduce((sum, row) => sum + row.total, 0);
    
    return result.recordset.map(row => ({
      level: row.level,
      completed: row.completed,
      inProgress: row.inProgress,
      target: Math.round(totalEmployees * (row.level === 'Level 1' ? 0.8 : row.level === 'Level 2' ? 0.6 : row.level === 'Level 3' ? 0.4 : row.level === 'Consultant' ? 0.2 : 0.1)),
      efficiency: totalEmployees > 0 ? (row.completed / totalEmployees) * 100 : 0,
      avgTime: Math.round(row.avgTime || 0)
    }));
  }

  async getRecentActivity(filters = {}) {
    try {
      const pool = await getPool();
      const request = pool.request();
      
      let whereClause = '';
      const conditions = [];
      
      // Handle facility filter - can be string or array
      if (filters.facility && filters.facility !== 'all') {
        const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
        if (facilities.length === 1) {
          conditions.push('e.facility = @facility0');
          request.input('facility0', sql.VarChar, facilities[0]);
        } else if (facilities.length > 1) {
          const facilityParams = facilities.map((f, i) => `@facility${i}`).join(', ');
          facilities.forEach((f, i) => {
            request.input(`facility${i}`, sql.VarChar, f);
          });
          conditions.push(`e.facility IN (${facilityParams})`);
        }
      }
      
      if (filters.area && filters.area !== 'all') {
        conditions.push('e.area = @area');
        request.input('area', sql.VarChar, filters.area);
      }
      
      if (filters.level && filters.level !== 'all') {
        conditions.push('e.awardType = @level');
        request.input('level', sql.VarChar, filters.level);
      }
      
      // Add the date condition to the where clause - show recent conference approvals
      conditions.push('e.conferenceCompleted IS NOT NULL');
      conditions.push('e.conferenceCompleted != \'\'');
      conditions.push('e.awaiting = 0');
      
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
      
      const query = `
        SELECT TOP 10
          e.name as employee,
          e.facility,
          e.awardType as achievement,
          e.conferenceCompleted as date,
          e.awaiting,
          DATEDIFF(day, e.assignedDate, e.conferenceCompleted) as timeToComplete
        FROM dbo.SecureCareEmployee e
        ${whereClause}
        ORDER BY e.conferenceCompleted DESC
      `;
      
      const result = await request.query(query);
      
      // Debug: Log the query and result count
      console.log('Recent Activity Query:', query);
      console.log('Recent Activity Result Count:', result.recordset.length);
      if (result.recordset.length > 0) {
        console.log('Sample record:', result.recordset[0]);
      }
      
      return result.recordset.map(row => ({
        employee: row.employee,
        facility: row.facility,
        achievement: row.achievement,
        date: row.date,
        timeToComplete: row.timeToComplete || 0,
        performance: row.timeToComplete < 120 ? 'Excellent' : row.timeToComplete < 180 ? 'Good' : 'Average'
      }));
    } catch (error) {
      console.error('Error in getRecentActivity:', error);
      throw error;
    }
  }

  async getAnalyticsMetrics(filters = {}) {
    const pool = await getPool();
    const request = pool.request();
    
    let whereClause = '';
    const conditions = [];
    
    // Handle facility filter - can be string or array
    if (filters.facility && filters.facility !== 'all') {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      if (facilities.length === 1) {
        conditions.push('e.facility = @facility0');
        request.input('facility0', sql.VarChar, facilities[0]);
      } else if (facilities.length > 1) {
        const facilityParams = facilities.map((f, i) => `@facility${i}`).join(', ');
        facilities.forEach((f, i) => {
          request.input(`facility${i}`, sql.VarChar, f);
        });
        conditions.push(`e.facility IN (${facilityParams})`);
      }
    }
    
    if (filters.area && filters.area !== 'all') {
      conditions.push('e.area = @area');
      request.input('area', sql.VarChar, filters.area);
    }
    
    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }
    
    const query = `
      SELECT 
        SUM(CASE WHEN e.assignedDate IS NOT NULL AND e.secureCareAwarded = 0 THEN 1 ELSE 0 END) as activeTrainingSessions,
        SUM(CASE 
          WHEN e.assignedDate IS NOT NULL 
          AND e.secureCareAwarded = 0 
          AND DATEDIFF(day, e.assignedDate, GETDATE()) > 30 
          THEN 1 ELSE 0 
        END) as overdueTraining,
        SUM(CASE 
          WHEN e.secureCareAwardedDate IS NOT NULL 
          AND e.secureCareAwardedDate >= DATEADD(day, -7, GETDATE()) 
          THEN 1 ELSE 0 
        END) as recentCompletions,
        COUNT(*) as totalEmployees,
        SUM(CASE WHEN e.secureCareAwarded = 1 THEN 1 ELSE 0 END) as completedCertifications
      FROM dbo.SecureCareEmployee e
      ${whereClause}
    `;
    
    const result = await request.query(query);
    const data = result.recordset[0];
    
    return {
      activeTrainingSessions: data.activeTrainingSessions,
      overdueTraining: data.overdueTraining,
      recentCompletions: data.recentCompletions,
      trainingEfficiency: data.totalEmployees > 0 ? ((data.completedCertifications / data.totalEmployees) * 100).toFixed(1) : '0'
    };
  }

  // Aggregates for Completions & Counts page
  async getCompletionsAggregates(filters = {}) {
    const pool = await getPool();
    const request = pool.request();

    const conditions = [];
    // Handle facility filter - can be string or array
    if (filters.facility && filters.facility !== 'all') {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      if (facilities.length === 1) {
        conditions.push('e.facility = @facility0');
        request.input('facility0', sql.VarChar, facilities[0]);
      } else if (facilities.length > 1) {
        const facilityParams = facilities.map((f, i) => `@facility${i}`).join(', ');
        facilities.forEach((f, i) => {
          request.input(`facility${i}`, sql.VarChar, f);
        });
        conditions.push(`e.facility IN (${facilityParams})`);
      }
    }
    if (filters.area && filters.area !== 'all') {
      conditions.push('e.area = @area');
      request.input('area', sql.VarChar, filters.area);
    }
    if (filters.level && filters.level !== 'all') {
      conditions.push('e.awardType = @level');
      request.input('level', sql.VarChar, filters.level);
    }
    // Always define date params (nullable) so SQL can reference them
    request.input('startDate', sql.Date, filters.startDate || null);
    request.input('endDate', sql.Date, filters.endDate || null);

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';


    const query = `
      /*
        Build two views:
        - RankedPerEmployee: One row per employeeNumber (for total unique employees)
        - RankedPerLevel: One row per employeeNumber + awardType + awaiting (to match Dashboard per-level counting)
      */
      WITH RankedPerEmployee AS (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY e.employeeNumber
            ORDER BY 
              CASE e.awardType 
                WHEN 'Level 1' THEN 1
                WHEN 'Level 2' THEN 2
                WHEN 'Level 3' THEN 3
                WHEN 'Consultant' THEN 4
                WHEN 'Coach' THEN 5
                ELSE 6
              END,
              e.assignedDate DESC
          ) as rn_emp
        FROM dbo.SecureCareEmployee e
        ${where}
      ),
      RankedPerLevel AS (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY e.employeeNumber, e.awardType, e.awaiting
            ORDER BY 
              CASE e.awardType 
                WHEN 'Level 1' THEN 1
                WHEN 'Level 2' THEN 2
                WHEN 'Level 3' THEN 3
                WHEN 'Consultant' THEN 4
                WHEN 'Coach' THEN 5
                ELSE 6
              END,
              e.assignedDate DESC
          ) as rn_lvl
        FROM dbo.SecureCareEmployee e
        ${where}
      )
      SELECT 
        /* total unique employees */
        (SELECT COUNT(DISTINCT employeeNumber) FROM RankedPerEmployee) AS total,

        /* completed: awarded within range (or all time when no date range) */
        SUM(CASE WHEN rpl.secureCareAwarded = 1 AND (
          (@startDate IS NULL AND @endDate IS NULL) OR
          (rpl.secureCareAwardedDate IS NOT NULL AND rpl.secureCareAwardedDate BETWEEN @startDate AND @endDate)
        ) THEN 1 ELSE 0 END) AS completed,

        /* scheduled: employees with specific training sessions scheduled (but not completed) */
        SUM(CASE WHEN (rpl.secureCareAwarded IS NULL OR rpl.secureCareAwarded = 0) AND (
          (rpl.scheduleStandingVideo IS NOT NULL AND rpl.scheduleStandingVideo != '' AND rpl.standingVideo IS NULL) OR
          (rpl.scheduleSleepingVideo IS NOT NULL AND rpl.scheduleSleepingVideo != '' AND rpl.sleepingVideo IS NULL) OR
          (rpl.scheduleFeedGradVideo IS NOT NULL AND rpl.scheduleFeedGradVideo != '' AND rpl.feedGradVideo IS NULL) OR
          (rpl.schedulenoHandnoSpeak IS NOT NULL AND rpl.schedulenoHandnoSpeak != '' AND rpl.noHandnoSpeak IS NULL) OR
          (rpl.[scheduleSession#1] IS NOT NULL AND rpl.[scheduleSession#1] != '' AND rpl.[session#1] IS NULL) OR
          (rpl.[scheduleSession#2] IS NOT NULL AND rpl.[scheduleSession#2] != '' AND rpl.[session#2] IS NULL) OR
          (rpl.[scheduleSession#3] IS NOT NULL AND rpl.[scheduleSession#3] != '' AND rpl.[session#3] IS NULL)
        ) AND (
          (@startDate IS NULL AND @endDate IS NULL) OR
          (rpl.scheduleStandingVideo BETWEEN @startDate AND @endDate) OR
          (rpl.scheduleSleepingVideo BETWEEN @startDate AND @endDate) OR
          (rpl.scheduleFeedGradVideo BETWEEN @startDate AND @endDate) OR
          (rpl.schedulenoHandnoSpeak BETWEEN @startDate AND @endDate) OR
          (rpl.[scheduleSession#1] BETWEEN @startDate AND @endDate) OR
          (rpl.[scheduleSession#2] BETWEEN @startDate AND @endDate) OR
          (rpl.[scheduleSession#3] BETWEEN @startDate AND @endDate)
        ) THEN 1 ELSE 0 END) AS scheduled,

        /* inProgress: sum of per-level in-progress counts (can exceed total) */
        SUM(CASE WHEN (rpl.secureCareAwarded IS NULL OR rpl.secureCareAwarded = 0) AND (
          (rpl.awardType = 'Level 1' AND rpl.assignedDate IS NOT NULL) OR 
          (rpl.awardType <> 'Level 1' AND rpl.conferenceCompleted IS NOT NULL AND rpl.conferenceCompleted != '' AND rpl.awaiting = 0)
        ) AND (
          (@startDate IS NULL AND @endDate IS NULL) OR
          (rpl.assignedDate BETWEEN @startDate AND @endDate) OR
          (rpl.conferenceCompleted BETWEEN @startDate AND @endDate)
        ) THEN 1 ELSE 0 END) AS inProgress,

        /* awaiting: conference completed and awaiting approval */
        SUM(CASE WHEN rpl.awardType <> 'Level 1' AND rpl.awaiting = 1 AND (
          (@startDate IS NULL AND @endDate IS NULL) OR
          (rpl.conferenceCompleted BETWEEN @startDate AND @endDate)
        ) THEN 1 ELSE 0 END) AS awaiting,

        /* rejected: count all rejected conference records (not deduped) */
        (
          SELECT COUNT(*) FROM (
            SELECT e.* FROM dbo.SecureCareEmployee e ${where ? where.replace('WHERE', 'WHERE') : ''}
          ) rej
          WHERE rej.conferenceCompleted IS NOT NULL AND rej.conferenceCompleted != '' AND rej.awaiting IS NULL AND (
            (@startDate IS NULL AND @endDate IS NULL) OR
            (rej.conferenceCompleted BETWEEN @startDate AND @endDate)
          )
        ) AS rejected
      FROM RankedPerLevel rpl
      WHERE rpl.rn_lvl = 1
    `;

    const result = await request.query(query);

    // Breakdown by level with deduplication
    const breakdownQuery = `
      WITH RankedPerLevel AS (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY e.employeeNumber, e.awardType, e.awaiting 
            ORDER BY 
              CASE e.awardType 
                WHEN 'Level 1' THEN 1
                WHEN 'Level 2' THEN 2
                WHEN 'Level 3' THEN 3
                WHEN 'Consultant' THEN 4
                WHEN 'Coach' THEN 5
                ELSE 6
              END,
              e.assignedDate DESC
          ) as rn_lvl
        FROM dbo.SecureCareEmployee e
        ${where}
      )
      SELECT awardType as level,
        SUM(CASE WHEN secureCareAwarded = 1 AND (
          (@startDate IS NULL AND @endDate IS NULL) OR
          (secureCareAwardedDate IS NOT NULL AND secureCareAwardedDate BETWEEN @startDate AND @endDate)
        ) THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN (secureCareAwarded IS NULL OR secureCareAwarded = 0) AND (
          (awardType = 'Level 1') OR 
          (awardType != 'Level 1' AND conferenceCompleted IS NOT NULL AND conferenceCompleted != '' AND awaiting = 0)
        ) AND (
          (@startDate IS NULL AND @endDate IS NULL) OR
          (assignedDate BETWEEN @startDate AND @endDate) OR
          (conferenceCompleted BETWEEN @startDate AND @endDate)
        ) THEN 1 ELSE 0 END) AS inProgress
      FROM RankedPerLevel
      WHERE rn_lvl = 1
      GROUP BY awardType
    `;

    const breakdownReq = pool.request();
    // Handle facility filter - can be string or array (uses same params as main request)
    if (filters.facility && filters.facility !== 'all') {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      facilities.forEach((f, i) => {
        breakdownReq.input(`facility${i}`, sql.VarChar, f);
      });
    }
    if (filters.area && filters.area !== 'all') breakdownReq.input('area', sql.VarChar, filters.area);
    if (filters.level && filters.level !== 'all') breakdownReq.input('level', sql.VarChar, filters.level);
    breakdownReq.input('startDate', sql.Date, filters.startDate || null);
    breakdownReq.input('endDate', sql.Date, filters.endDate || null);

    const byLevel = await breakdownReq.query(breakdownQuery);

    return {
      totals: result.recordset[0] || { total: 0, completed: 0, scheduled: 0, inProgress: 0, awaiting: 0, rejected: 0 },
      byLevel: byLevel.recordset || []
    };
  }

  // Get all employee data aggregated by employeeNumber (one row per employee with all levels)
  async getAllEmployeeData(filters = {}) {
    const pool = await getPool();
    
    const facilities = filters.facility && filters.facility !== 'all'
      ? (Array.isArray(filters.facility) ? filters.facility : [filters.facility]).filter(Boolean)
      : null;

    const conditions = [];
    if (facilities && facilities.length === 1) {
      conditions.push('e.facility = @facility0');
    } else if (facilities && facilities.length > 1) {
      const facilityParams = facilities.map((f, i) => `@facility${i}`).join(', ');
      conditions.push(`e.facility IN (${facilityParams})`);
    }
    if (filters.area && filters.area !== 'all') {
      conditions.push('e.area = @area');
    }
    if (filters.search) {
      conditions.push('(e.name LIKE @search OR e.employeeNumber LIKE @search)');
    }
    if (filters.jobTitle && filters.jobTitle !== 'all') {
      conditions.push('e.staffRoll = @jobTitle');
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sortBy = filters.sortBy || 'area';
    const sortOrder = normalizeSortOrder(filters.sortOrder);
    let orderByClause = '';
    switch (sortBy) {
      case 'name':
        orderByClause = `fe.name ${sortOrder}`;
        break;
      case 'facility':
        orderByClause = `fe.facility ${sortOrder}`;
        break;
      case 'area':
        orderByClause = `fe.area ${sortOrder}, fe.name ${sortOrder}`;
        break;
      case 'employeeId':
        orderByClause = `fe.employeeNumber ${sortOrder}`;
        break;
      default:
        orderByClause = `fe.area ${sortOrder}, fe.name ${sortOrder}`;
    }

    const page = parseInt(filters.page) || 1;
    const requestedLimit = parseInt(filters.limit) || 1000;
    const limit = requestedLimit > 10000 ? 10000 : requestedLimit;
    const offset = (page - 1) * limit;

    const dataRequest = pool.request();
    if (facilities && facilities.length > 0) {
      facilities.forEach((facility, index) => {
        dataRequest.input(`facility${index}`, sql.VarChar, facility);
      });
    }
    if (filters.area && filters.area !== 'all') {
      dataRequest.input('area', sql.VarChar, filters.area);
    }
    if (filters.search) {
      dataRequest.input('search', sql.VarChar, `%${filters.search}%`);
    }
    if (filters.jobTitle && filters.jobTitle !== 'all') {
      dataRequest.input('jobTitle', sql.VarChar, filters.jobTitle);
    }
    dataRequest.input('offset', sql.Int, offset);
    dataRequest.input('limit', sql.Int, limit);

    const dataQuery = `
      WITH FilteredEmployees AS (
        SELECT
          e.employeeNumber,
          MAX(e.employeeId) as employeeId,
          MAX(e.name) as name,
          MAX(e.facility) as facility,
          MAX(e.area) as area,
          MAX(e.staffRoll) as staffRoll
        FROM dbo.SecureCareEmployee e
        ${whereClause}
        GROUP BY e.employeeNumber
      ),
      OrderedEmployees AS (
        SELECT
          fe.*,
          ROW_NUMBER() OVER (ORDER BY ${orderByClause}) as row_num
        FROM FilteredEmployees fe
      ),
      PagedEmployees AS (
        SELECT *
        FROM OrderedEmployees
        WHERE row_num > @offset AND row_num <= @offset + @limit
      )
      SELECT
        p.employeeId,
        p.employeeNumber,
        p.name,
        p.facility,
        p.area,
        p.staffRoll,
        MAX(CASE WHEN e.awardType = 'Level 1' THEN CONVERT(varchar(10), e.assignedDate, 120) END) AS level1AssignedDate,
        MAX(CASE WHEN e.awardType = 'Level 1' THEN CONVERT(varchar(10), e.completedDate, 120) END) AS level1CompletedDate,
        MAX(CASE WHEN e.awardType = 'Level 1' THEN e.secureCareAwarded END) AS level1SecureCareAwarded,
        MAX(CASE WHEN e.awardType = 'Level 1' THEN CONVERT(varchar(10), e.secureCareAwardedDate, 120) END) AS level1SecureCareAwardedDate,
        MAX(CASE WHEN e.awardType = 'Level 2' THEN CONVERT(varchar(10), e.conferenceCompleted, 120) END) AS level2ConferenceCompleted,
        MAX(CASE WHEN e.awardType = 'Level 2' THEN e.notes END) AS level2Notes,
        MAX(CASE WHEN e.awardType = 'Level 2' THEN e.advisorId END) AS level2AdvisorId,
        MAX(CASE WHEN e.awardType = 'Level 2' THEN a.firstName + ' ' + ISNULL(a.lastName, '') END) AS level2AdvisorName,
        MAX(CASE WHEN e.awardType = 'Level 2' THEN CONVERT(varchar(10), e.standingVideo, 120) END) AS level2StandingVideo,
        MAX(CASE WHEN e.awardType = 'Level 2' THEN CONVERT(varchar(10), e.sleepingVideo, 120) END) AS level2SleepingVideo,
        MAX(CASE WHEN e.awardType = 'Level 2' THEN CONVERT(varchar(10), e.feedGradVideo, 120) END) AS level2FeedGradVideo,
        MAX(CASE WHEN e.awardType = 'Level 2' THEN e.secureCareAwarded END) AS level2SecureCareAwarded,
        MAX(CASE WHEN e.awardType = 'Level 2' THEN CONVERT(varchar(10), e.secureCareAwardedDate, 120) END) AS level2SecureCareAwardedDate,
        MAX(CASE WHEN e.awardType = 'Level 2' THEN e.awaiting END) AS level2Awaiting,
        MAX(CASE WHEN e.awardType = 'Level 3' THEN CONVERT(varchar(10), e.conferenceCompleted, 120) END) AS level3ConferenceCompleted,
        MAX(CASE WHEN e.awardType = 'Level 3' THEN CONVERT(varchar(10), e.standingVideo, 120) END) AS level3StandingVideo,
        MAX(CASE WHEN e.awardType = 'Level 3' THEN CONVERT(varchar(10), e.noHandnoSpeak, 120) END) AS level3NoHandnoSpeak,
        MAX(CASE WHEN e.awardType = 'Level 3' THEN CONVERT(varchar(10), e.sleepingVideo, 120) END) AS level3SleepingVideo,
        MAX(CASE WHEN e.awardType = 'Level 3' THEN e.secureCareAwarded END) AS level3SecureCareAwarded,
        MAX(CASE WHEN e.awardType = 'Level 3' THEN CONVERT(varchar(10), e.secureCareAwardedDate, 120) END) AS level3SecureCareAwardedDate,
        MAX(CASE WHEN e.awardType = 'Level 3' THEN e.awaiting END) AS level3Awaiting,
        MAX(CASE WHEN e.awardType = 'Consultant' THEN CONVERT(varchar(10), e.conferenceCompleted, 120) END) AS consultantConferenceCompleted,
        MAX(CASE WHEN e.awardType = 'Consultant' THEN CONVERT(varchar(10), e.[session#1], 120) END) AS consultantSession1,
        MAX(CASE WHEN e.awardType = 'Consultant' THEN CONVERT(varchar(10), e.[session#2], 120) END) AS consultantSession2,
        MAX(CASE WHEN e.awardType = 'Consultant' THEN CONVERT(varchar(10), e.[session#3], 120) END) AS consultantSession3,
        MAX(CASE WHEN e.awardType = 'Consultant' THEN e.secureCareAwarded END) AS consultantSecureCareAwarded,
        MAX(CASE WHEN e.awardType = 'Consultant' THEN CONVERT(varchar(10), e.secureCareAwardedDate, 120) END) AS consultantSecureCareAwardedDate,
        MAX(CASE WHEN e.awardType = 'Consultant' THEN e.awaiting END) AS consultantAwaiting,
        MAX(CASE WHEN e.awardType = 'Coach' THEN CONVERT(varchar(10), e.conferenceCompleted, 120) END) AS coachConferenceCompleted,
        MAX(CASE WHEN e.awardType = 'Coach' THEN CONVERT(varchar(10), e.[session#1], 120) END) AS coachSession1,
        MAX(CASE WHEN e.awardType = 'Coach' THEN CONVERT(varchar(10), e.[session#2], 120) END) AS coachSession2,
        MAX(CASE WHEN e.awardType = 'Coach' THEN CONVERT(varchar(10), e.[session#3], 120) END) AS coachSession3,
        MAX(CASE WHEN e.awardType = 'Coach' THEN e.secureCareAwarded END) AS coachSecureCareAwarded,
        MAX(CASE WHEN e.awardType = 'Coach' THEN CONVERT(varchar(10), e.secureCareAwardedDate, 120) END) AS coachSecureCareAwardedDate,
        MAX(CASE WHEN e.awardType = 'Coach' THEN e.awaiting END) AS coachAwaiting
      FROM PagedEmployees p
      LEFT JOIN dbo.SecureCareEmployee e ON e.employeeNumber = p.employeeNumber
      LEFT JOIN dbo.Advisor a ON e.advisorId = a.advisorId
      GROUP BY
        p.employeeId,
        p.employeeNumber,
        p.name,
        p.facility,
        p.area,
        p.staffRoll,
        p.row_num
      ORDER BY p.row_num
    `;

    const dataResult = await dataRequest.query(dataQuery);

    const countRequest = pool.request();
    if (facilities && facilities.length > 0) {
      facilities.forEach((facility, index) => {
        countRequest.input(`facility${index}`, sql.VarChar, facility);
      });
    }
    if (filters.area && filters.area !== 'all') {
      countRequest.input('area', sql.VarChar, filters.area);
    }
    if (filters.search) {
      countRequest.input('search', sql.VarChar, `%${filters.search}%`);
    }
    if (filters.jobTitle && filters.jobTitle !== 'all') {
      countRequest.input('jobTitle', sql.VarChar, filters.jobTitle);
    }

    const countQuery = `
      SELECT COUNT(DISTINCT e.employeeNumber) as total
      FROM dbo.SecureCareEmployee e
      ${whereClause}
    `;
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;
    
    return {
      employees: dataResult.recordset,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalEmployees: total,
        itemsPerPage: limit
      }
    };
  }

  // Get employees ready for Level 2 award (Level 1 awarded, all Level 2 videos completed, Level 2 not awarded)
  async getEmployeesReadyForLevel2Award(filters = {}) {
    const pool = await getPool();
    
    let query = `
      SELECT DISTINCT
        l1.employeeNumber,
        l1.employeeId,
        l1.[name],
        l1.[area],
        l1.[facility],
        l1.staffRoll,
        CONVERT(varchar(10), l1.assignedDate, 120) AS level1AssignedDate,
        CONVERT(varchar(10), l1.completedDate, 120) AS level1CompletedDate,
        l1.secureCareAwarded AS level1SecureCareAwarded,
        CONVERT(varchar(10), l1.secureCareAwardedDate, 120) AS level1SecureCareAwardedDate,
        CONVERT(varchar(10), l2.conferenceCompleted, 120) AS level2ConferenceCompleted,
        l2.notes AS level2Notes,
        l2.advisorId AS level2AdvisorId,
        a.firstName + ' ' + ISNULL(a.lastName, '') AS level2AdvisorName,
        CONVERT(varchar(10), l2.standingVideo, 120) AS level2StandingVideo,
        CONVERT(varchar(10), l2.sleepingVideo, 120) AS level2SleepingVideo,
        CONVERT(varchar(10), l2.feedGradVideo, 120) AS level2FeedGradVideo,
        l2.secureCareAwarded AS level2SecureCareAwarded,
        CONVERT(varchar(10), l2.secureCareAwardedDate, 120) AS level2SecureCareAwardedDate,
        l2.awaiting AS level2Awaiting
      FROM [dbo].[SecureCareEmployee] l1
      JOIN [dbo].[SecureCareEmployee] l2
        ON l2.employeeNumber = l1.employeeNumber
      LEFT JOIN dbo.Advisor a ON l2.advisorId = a.advisorId
      WHERE l1.awardType = 'Level 1'
        AND (l1.secureCareAwarded = 1 OR l1.secureCareAwardedDate IS NOT NULL)
        AND l1.assignedDate IS NOT NULL
        AND l1.completedDate IS NOT NULL
        AND l2.awardType = 'Level 2'
        AND (l2.secureCareAwarded = 0 OR l2.secureCareAwarded IS NULL)
        AND l2.secureCareAwardedDate IS NULL
        AND l2.standingVideo IS NOT NULL
        AND l2.sleepingVideo IS NOT NULL
        AND l2.feedGradVideo IS NOT NULL
    `;
    
    const request = pool.request();
    
    // Apply additional filters
    if (filters.facility && filters.facility !== 'all') {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      if (facilities.length === 1) {
        query += ` AND l1.facility = @facility0`;
        request.input('facility0', sql.VarChar, facilities[0]);
      } else if (facilities.length > 1) {
        const facilityParams = facilities.map((f, i) => `@facility${i}`).join(', ');
        query += ` AND l1.facility IN (${facilityParams})`;
        facilities.forEach((f, i) => {
          request.input(`facility${i}`, sql.VarChar, f);
        });
      }
    }
    
    if (filters.area && filters.area !== 'all') {
      query += ` AND l1.area = @area`;
      request.input('area', sql.VarChar, filters.area);
    }
    
    if (filters.search) {
      query += ` AND (l1.name LIKE @search OR l1.employeeNumber LIKE @search)`;
      request.input('search', sql.VarChar, `%${filters.search}%`);
    }
    
    if (filters.jobTitle && filters.jobTitle !== 'all') {
      query += ` AND l1.staffRoll = @jobTitle`;
      request.input('jobTitle', sql.VarChar, filters.jobTitle);
    }
    
    // Add sorting
    const sortBy = filters.sortBy || 'area';
    const sortOrder = normalizeSortOrder(filters.sortOrder);
    switch (sortBy) {
      case 'name':
        query += ` ORDER BY l1.name ${sortOrder.toUpperCase()}`;
        break;
      case 'facility':
        query += ` ORDER BY l1.facility ${sortOrder.toUpperCase()}`;
        break;
      case 'area':
        // Sort by area first, then name
        query += ` ORDER BY l1.area ${sortOrder.toUpperCase()}, l1.name ${sortOrder.toUpperCase()}`;
        break;
      case 'employeeId':
        query += ` ORDER BY l1.employeeNumber ${sortOrder.toUpperCase()}`;
        break;
      default:
        // Default: sort by area first, then name
        query += ` ORDER BY l1.area ${sortOrder.toUpperCase()}, l1.name ${sortOrder.toUpperCase()}`;
    }
    
    // Add pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 100;
    const offset = (page - 1) * limit;
    query += ` OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
    
    const result = await request.query(query);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT l1.employeeNumber) as total
      FROM [dbo].[SecureCareEmployee] l1
      JOIN [dbo].[SecureCareEmployee] l2
        ON l2.employeeNumber = l1.employeeNumber
      WHERE l1.awardType = 'Level 1'
        AND (l1.secureCareAwarded = 1 OR l1.secureCareAwardedDate IS NOT NULL)
        AND l2.awardType = 'Level 2'
        AND (l2.secureCareAwarded = 0 OR l2.secureCareAwarded IS NULL)
        AND l2.secureCareAwardedDate IS NULL
        AND l2.standingVideo IS NOT NULL
        AND l2.sleepingVideo IS NOT NULL
        AND l2.feedGradVideo IS NOT NULL
    `;
    
    const countRequest = pool.request();
    
    if (filters.facility && filters.facility !== 'all') {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      if (facilities.length === 1) {
        countQuery += ` AND l1.facility = @facilityCount0`;
        countRequest.input('facilityCount0', sql.VarChar, facilities[0]);
      } else if (facilities.length > 1) {
        const facilityParams = facilities.map((f, i) => `@facilityCount${i}`).join(', ');
        countQuery += ` AND l1.facility IN (${facilityParams})`;
        facilities.forEach((f, i) => {
          countRequest.input(`facilityCount${i}`, sql.VarChar, f);
        });
      }
    }
    
    if (filters.area && filters.area !== 'all') {
      countQuery += ` AND l1.area = @area`;
      countRequest.input('area', sql.VarChar, filters.area);
    }
    
    if (filters.search) {
      countQuery += ` AND (l1.name LIKE @search OR l1.employeeNumber LIKE @search)`;
      countRequest.input('search', sql.VarChar, `%${filters.search}%`);
    }
    
    if (filters.jobTitle && filters.jobTitle !== 'all') {
      countQuery += ` AND l1.staffRoll = @jobTitle`;
      countRequest.input('jobTitle', sql.VarChar, filters.jobTitle);
    }
    
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;
    
    // Transform results to match the aggregated format
    const employees = result.recordset.map(record => ({
      employeeId: record.employeeId,
      employeeNumber: record.employeeNumber,
      name: record.name,
      facility: record.facility,
      area: record.area,
      staffRoll: record.staffRoll,
      // Level 1
      level1AssignedDate: record.level1AssignedDate,
      level1CompletedDate: record.level1CompletedDate,
      level1SecureCareAwarded: record.level1SecureCareAwarded,
      level1SecureCareAwardedDate: record.level1SecureCareAwardedDate,
      // Level 2
      level2ConferenceCompleted: record.level2ConferenceCompleted,
      level2Notes: record.level2Notes,
      level2AdvisorId: record.level2AdvisorId,
      level2AdvisorName: record.level2AdvisorName,
      level2StandingVideo: record.level2StandingVideo,
      level2SleepingVideo: record.level2SleepingVideo,
      level2FeedGradVideo: record.level2FeedGradVideo,
      level2SecureCareAwarded: record.level2SecureCareAwarded,
      level2SecureCareAwardedDate: record.level2SecureCareAwardedDate,
      level2Awaiting: record.level2Awaiting,
      // Other levels (null since we're only showing Level 1 and Level 2)
      level3ConferenceCompleted: null,
      level3StandingVideo: null,
      level3NoHandnoSpeak: null,
      level3SleepingVideo: null,
      level3SecureCareAwarded: null,
      level3SecureCareAwardedDate: null,
      level3Awaiting: null,
      consultantConferenceCompleted: null,
      consultantSession1: null,
      consultantSession2: null,
      consultantSession3: null,
      consultantSecureCareAwarded: null,
      consultantSecureCareAwardedDate: null,
      consultantAwaiting: null,
      coachConferenceCompleted: null,
      coachSession1: null,
      coachSession2: null,
      coachSession3: null,
      coachSecureCareAwarded: null,
      coachSecureCareAwardedDate: null,
      coachAwaiting: null
    }));
    
    return {
      employees: employees,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalEmployees: total,
        itemsPerPage: limit
      }
    };
  }

  // Get employees ready for Level 3 award (Level 2 awarded, all Level 3 videos completed, Level 3 not awarded)
  async getEmployeesReadyForLevel3Award(filters = {}) {
    const pool = await getPool();
    
    let query = `
      SELECT DISTINCT
        l2.employeeNumber,
        l2.employeeId,
        l2.[name],
        l2.[area],
        l2.[facility],
        l2.staffRoll,
        CONVERT(varchar(10), l1.assignedDate, 120) AS level1AssignedDate,
        CONVERT(varchar(10), l1.completedDate, 120) AS level1CompletedDate,
        l1.secureCareAwarded AS level1SecureCareAwarded,
        CONVERT(varchar(10), l1.secureCareAwardedDate, 120) AS level1SecureCareAwardedDate,
        CONVERT(varchar(10), l2.conferenceCompleted, 120) AS level2ConferenceCompleted,
        l2.notes AS level2Notes,
        l2.advisorId AS level2AdvisorId,
        a2.firstName + ' ' + ISNULL(a2.lastName, '') AS level2AdvisorName,
        CONVERT(varchar(10), l2.standingVideo, 120) AS level2StandingVideo,
        CONVERT(varchar(10), l2.sleepingVideo, 120) AS level2SleepingVideo,
        CONVERT(varchar(10), l2.feedGradVideo, 120) AS level2FeedGradVideo,
        l2.secureCareAwarded AS level2SecureCareAwarded,
        CONVERT(varchar(10), l2.secureCareAwardedDate, 120) AS level2SecureCareAwardedDate,
        l2.awaiting AS level2Awaiting,
        CONVERT(varchar(10), l3.conferenceCompleted, 120) AS level3ConferenceCompleted,
        l3.notes AS level3Notes,
        l3.advisorId AS level3AdvisorId,
        a3.firstName + ' ' + ISNULL(a3.lastName, '') AS level3AdvisorName,
        CONVERT(varchar(10), l3.standingVideo, 120) AS level3StandingVideo,
        CONVERT(varchar(10), l3.noHandnoSpeak, 120) AS level3NoHandnoSpeak,
        CONVERT(varchar(10), l3.sleepingVideo, 120) AS level3SleepingVideo,
        l3.secureCareAwarded AS level3SecureCareAwarded,
        CONVERT(varchar(10), l3.secureCareAwardedDate, 120) AS level3SecureCareAwardedDate,
        l3.awaiting AS level3Awaiting
      FROM [dbo].[SecureCareEmployee] l2
      JOIN [dbo].[SecureCareEmployee] l3
        ON l3.employeeNumber = l2.employeeNumber
      INNER JOIN [dbo].[SecureCareEmployee] l1
        ON l1.employeeNumber = l2.employeeNumber AND l1.awardType = 'Level 1'
      LEFT JOIN dbo.Advisor a2 ON l2.advisorId = a2.advisorId
      LEFT JOIN dbo.Advisor a3 ON l3.advisorId = a3.advisorId
      WHERE l2.awardType = 'Level 2'
        AND (l2.secureCareAwarded = 1 OR l2.secureCareAwardedDate IS NOT NULL)
        AND l1.secureCareAwarded = 1
        AND l3.awardType = 'Level 3'
        AND (l3.secureCareAwarded = 0 OR l3.secureCareAwarded IS NULL)
        AND l3.secureCareAwardedDate IS NULL
        AND l3.standingVideo IS NOT NULL
        AND l3.noHandnoSpeak IS NOT NULL
        AND l3.sleepingVideo IS NOT NULL
    `;
    
    const request = pool.request();
    
    // Apply additional filters
    if (filters.facility && filters.facility !== 'all') {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      if (facilities.length === 1) {
        query += ` AND l2.facility = @facility0`;
        request.input('facility0', sql.VarChar, facilities[0]);
      } else if (facilities.length > 1) {
        const facilityParams = facilities.map((f, i) => `@facility${i}`).join(', ');
        query += ` AND l2.facility IN (${facilityParams})`;
        facilities.forEach((f, i) => {
          request.input(`facility${i}`, sql.VarChar, f);
        });
      }
    }
    
    if (filters.area && filters.area !== 'all') {
      query += ` AND l2.area = @area`;
      request.input('area', sql.VarChar, filters.area);
    }
    
    if (filters.search) {
      query += ` AND (l2.name LIKE @search OR l2.employeeNumber LIKE @search)`;
      request.input('search', sql.VarChar, `%${filters.search}%`);
    }
    
    if (filters.jobTitle && filters.jobTitle !== 'all') {
      query += ` AND l2.staffRoll = @jobTitle`;
      request.input('jobTitle', sql.VarChar, filters.jobTitle);
    }
    
    // Add sorting
    const sortBy = filters.sortBy || 'area';
    const sortOrder = normalizeSortOrder(filters.sortOrder);
    switch (sortBy) {
      case 'name':
        query += ` ORDER BY l2.name ${sortOrder.toUpperCase()}`;
        break;
      case 'facility':
        query += ` ORDER BY l2.facility ${sortOrder.toUpperCase()}`;
        break;
      case 'area':
        // Sort by area first, then name
        query += ` ORDER BY l2.area ${sortOrder.toUpperCase()}, l2.name ${sortOrder.toUpperCase()}`;
        break;
      case 'employeeId':
        query += ` ORDER BY l2.employeeNumber ${sortOrder.toUpperCase()}`;
        break;
      default:
        // Default: sort by area first, then name
        query += ` ORDER BY l2.area ${sortOrder.toUpperCase()}, l2.name ${sortOrder.toUpperCase()}`;
    }
    
    // Add pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 100;
    const offset = (page - 1) * limit;
    query += ` OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
    
    const result = await request.query(query);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT l2.employeeNumber) as total
      FROM [dbo].[SecureCareEmployee] l2
      JOIN [dbo].[SecureCareEmployee] l3
        ON l3.employeeNumber = l2.employeeNumber
      INNER JOIN [dbo].[SecureCareEmployee] l1
        ON l1.employeeNumber = l2.employeeNumber AND l1.awardType = 'Level 1'
      WHERE l2.awardType = 'Level 2'
        AND (l2.secureCareAwarded = 1 OR l2.secureCareAwardedDate IS NOT NULL)
        AND l1.secureCareAwarded = 1
        AND l3.awardType = 'Level 3'
        AND (l3.secureCareAwarded = 0 OR l3.secureCareAwarded IS NULL)
        AND l3.secureCareAwardedDate IS NULL
        AND l3.standingVideo IS NOT NULL
        AND l3.noHandnoSpeak IS NOT NULL
        AND l3.sleepingVideo IS NOT NULL
    `;
    
    const countRequest = pool.request();
    
    if (filters.facility && filters.facility !== 'all') {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      if (facilities.length === 1) {
        countQuery += ` AND l2.facility = @facilityCount0`;
        countRequest.input('facilityCount0', sql.VarChar, facilities[0]);
      } else if (facilities.length > 1) {
        const facilityParams = facilities.map((f, i) => `@facilityCount${i}`).join(', ');
        countQuery += ` AND l2.facility IN (${facilityParams})`;
        facilities.forEach((f, i) => {
          countRequest.input(`facilityCount${i}`, sql.VarChar, f);
        });
      }
    }
    
    if (filters.area && filters.area !== 'all') {
      countQuery += ` AND l2.area = @area`;
      countRequest.input('area', sql.VarChar, filters.area);
    }
    
    if (filters.search) {
      countQuery += ` AND (l2.name LIKE @search OR l2.employeeNumber LIKE @search)`;
      countRequest.input('search', sql.VarChar, `%${filters.search}%`);
    }
    
    if (filters.jobTitle && filters.jobTitle !== 'all') {
      countQuery += ` AND l2.staffRoll = @jobTitle`;
      countRequest.input('jobTitle', sql.VarChar, filters.jobTitle);
    }
    
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;
    
    // Transform results to match the aggregated format
    const employees = result.recordset.map(record => ({
      employeeId: record.employeeId,
      employeeNumber: record.employeeNumber,
      name: record.name,
      facility: record.facility,
      area: record.area,
      staffRoll: record.staffRoll,
      // Level 1
      level1AssignedDate: record.level1AssignedDate,
      level1CompletedDate: record.level1CompletedDate,
      level1SecureCareAwarded: record.level1SecureCareAwarded,
      level1SecureCareAwardedDate: record.level1SecureCareAwardedDate,
      // Level 2
      level2ConferenceCompleted: record.level2ConferenceCompleted,
      level2Notes: record.level2Notes,
      level2AdvisorId: record.level2AdvisorId,
      level2AdvisorName: record.level2AdvisorName,
      level2StandingVideo: record.level2StandingVideo,
      level2SleepingVideo: record.level2SleepingVideo,
      level2FeedGradVideo: record.level2FeedGradVideo,
      level2SecureCareAwarded: record.level2SecureCareAwarded,
      level2SecureCareAwardedDate: record.level2SecureCareAwardedDate,
      level2Awaiting: record.level2Awaiting,
      // Level 3
      level3ConferenceCompleted: record.level3ConferenceCompleted,
      level3Notes: record.level3Notes,
      level3AdvisorId: record.level3AdvisorId,
      level3AdvisorName: record.level3AdvisorName,
      level3StandingVideo: record.level3StandingVideo,
      level3NoHandnoSpeak: record.level3NoHandnoSpeak,
      level3SleepingVideo: record.level3SleepingVideo,
      level3SecureCareAwarded: record.level3SecureCareAwarded,
      level3SecureCareAwardedDate: record.level3SecureCareAwardedDate,
      level3Awaiting: record.level3Awaiting,
      // Other levels (null)
      consultantConferenceCompleted: null,
      consultantSession1: null,
      consultantSession2: null,
      consultantSession3: null,
      consultantSecureCareAwarded: null,
      consultantSecureCareAwardedDate: null,
      consultantAwaiting: null,
      coachConferenceCompleted: null,
      coachSession1: null,
      coachSession2: null,
      coachSession3: null,
      coachSecureCareAwarded: null,
      coachSecureCareAwardedDate: null,
      coachAwaiting: null
    }));
    
    return {
      employees: employees,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalEmployees: total,
        itemsPerPage: limit
      }
    };
  }

  // Get employees ready for Consultant award (Level 3 awarded, all Consultant sessions completed, Consultant not awarded)
  async getEmployeesReadyForConsultantAward(filters = {}) {
    const pool = await getPool();
    
    let query = `
      SELECT DISTINCT
        consultant.employeeNumber,
        consultant.employeeId,
        consultant.[name],
        consultant.[area],
        consultant.[facility],
        consultant.staffRoll,
        CONVERT(varchar(10), l1.assignedDate, 120) AS level1AssignedDate,
        CONVERT(varchar(10), l1.completedDate, 120) AS level1CompletedDate,
        l1.secureCareAwarded AS level1SecureCareAwarded,
        CONVERT(varchar(10), l1.secureCareAwardedDate, 120) AS level1SecureCareAwardedDate,
        CONVERT(varchar(10), l2.conferenceCompleted, 120) AS level2ConferenceCompleted,
        l2.notes AS level2Notes,
        l2.advisorId AS level2AdvisorId,
        a2.firstName + ' ' + ISNULL(a2.lastName, '') AS level2AdvisorName,
        CONVERT(varchar(10), l2.standingVideo, 120) AS level2StandingVideo,
        CONVERT(varchar(10), l2.sleepingVideo, 120) AS level2SleepingVideo,
        CONVERT(varchar(10), l2.feedGradVideo, 120) AS level2FeedGradVideo,
        l2.secureCareAwarded AS level2SecureCareAwarded,
        CONVERT(varchar(10), l2.secureCareAwardedDate, 120) AS level2SecureCareAwardedDate,
        l2.awaiting AS level2Awaiting,
        CONVERT(varchar(10), l3.conferenceCompleted, 120) AS level3ConferenceCompleted,
        l3.notes AS level3Notes,
        l3.advisorId AS level3AdvisorId,
        a3.firstName + ' ' + ISNULL(a3.lastName, '') AS level3AdvisorName,
        CONVERT(varchar(10), l3.standingVideo, 120) AS level3StandingVideo,
        CONVERT(varchar(10), l3.noHandnoSpeak, 120) AS level3NoHandnoSpeak,
        CONVERT(varchar(10), l3.sleepingVideo, 120) AS level3SleepingVideo,
        l3.secureCareAwarded AS level3SecureCareAwarded,
        CONVERT(varchar(10), l3.secureCareAwardedDate, 120) AS level3SecureCareAwardedDate,
        l3.awaiting AS level3Awaiting,
        CONVERT(varchar(10), consultant.conferenceCompleted, 120) AS consultantConferenceCompleted,
        consultant.notes AS consultantNotes,
        consultant.advisorId AS consultantAdvisorId,
        aConsultant.firstName + ' ' + ISNULL(aConsultant.lastName, '') AS consultantAdvisorName,
        CONVERT(varchar(10), consultant.[session#1], 120) AS consultantSession1,
        CONVERT(varchar(10), consultant.[session#2], 120) AS consultantSession2,
        CONVERT(varchar(10), consultant.[session#3], 120) AS consultantSession3,
        consultant.secureCareAwarded AS consultantSecureCareAwarded,
        CONVERT(varchar(10), consultant.secureCareAwardedDate, 120) AS consultantSecureCareAwardedDate,
        consultant.awaiting AS consultantAwaiting
      FROM [dbo].[SecureCareEmployee] consultant
      INNER JOIN [dbo].[SecureCareEmployee] l1
        ON l1.employeeNumber = consultant.employeeNumber AND l1.awardType = 'Level 1'
      INNER JOIN [dbo].[SecureCareEmployee] l2
        ON l2.employeeNumber = consultant.employeeNumber AND l2.awardType = 'Level 2'
      LEFT JOIN [dbo].[SecureCareEmployee] l3
        ON l3.employeeNumber = consultant.employeeNumber AND l3.awardType = 'Level 3'
      LEFT JOIN dbo.Advisor a2 ON l2.advisorId = a2.advisorId
      LEFT JOIN dbo.Advisor a3 ON l3.advisorId = a3.advisorId
      LEFT JOIN dbo.Advisor aConsultant ON consultant.advisorId = aConsultant.advisorId
      WHERE consultant.awardType = 'Consultant'
        AND (l1.secureCareAwarded = 1 OR l1.secureCareAwardedDate IS NOT NULL)
        AND (l2.secureCareAwarded = 1 OR l2.secureCareAwardedDate IS NOT NULL)
        -- Level 3 awarded is optional for Consultant (no check needed)
        AND (consultant.secureCareAwarded = 0 OR consultant.secureCareAwarded IS NULL)
        AND consultant.secureCareAwardedDate IS NULL
        AND consultant.[session#1] IS NOT NULL
        AND consultant.[session#1] != ''
        AND consultant.[session#2] IS NOT NULL
        AND consultant.[session#2] != ''
        AND consultant.[session#3] IS NOT NULL
        AND consultant.[session#3] != ''
    `;
    
    const request = pool.request();
    
    // Apply additional filters
    if (filters.facility && filters.facility !== 'all') {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      if (facilities.length === 1) {
        query += ` AND consultant.facility = @facility0`;
        request.input('facility0', sql.VarChar, facilities[0]);
      } else if (facilities.length > 1) {
        const facilityParams = facilities.map((f, i) => `@facility${i}`).join(', ');
        query += ` AND consultant.facility IN (${facilityParams})`;
        facilities.forEach((f, i) => {
          request.input(`facility${i}`, sql.VarChar, f);
        });
      }
    }
    
    if (filters.area && filters.area !== 'all') {
      query += ` AND consultant.area = @area`;
      request.input('area', sql.VarChar, filters.area);
    }
    
    if (filters.search) {
      query += ` AND (consultant.name LIKE @search OR consultant.employeeNumber LIKE @search)`;
      request.input('search', sql.VarChar, `%${filters.search}%`);
    }
    
    if (filters.jobTitle && filters.jobTitle !== 'all') {
      query += ` AND consultant.staffRoll = @jobTitle`;
      request.input('jobTitle', sql.VarChar, filters.jobTitle);
    }
    
    // Add sorting
    const sortBy = filters.sortBy || 'area';
    const sortOrder = normalizeSortOrder(filters.sortOrder);
    switch (sortBy) {
      case 'name':
        query += ` ORDER BY consultant.name ${sortOrder.toUpperCase()}`;
        break;
      case 'facility':
        query += ` ORDER BY consultant.facility ${sortOrder.toUpperCase()}`;
        break;
      case 'area':
        query += ` ORDER BY consultant.area ${sortOrder.toUpperCase()}, consultant.name ${sortOrder.toUpperCase()}`;
        break;
      case 'employeeId':
        query += ` ORDER BY consultant.employeeNumber ${sortOrder.toUpperCase()}`;
        break;
      default:
        query += ` ORDER BY consultant.area ${sortOrder.toUpperCase()}, consultant.name ${sortOrder.toUpperCase()}`;
    }
    
    // Add pagination - allow large limits to show all data
    const page = parseInt(filters.page) || 1;
    const requestedLimit = parseInt(filters.limit) || 1000;
    // Allow up to 10,000 records to show all data
    const limit = requestedLimit > 10000 ? 10000 : requestedLimit;
    const offset = (page - 1) * limit;
    query += ` OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
    
    let result;
    try {
      result = await request.query(query);
    } catch (error) {
      console.error('Error in getEmployeesReadyForConsultantAward query:', error);
      console.error('Query:', query);
      throw error;
    }
    
    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT consultant.employeeNumber) as total
      FROM [dbo].[SecureCareEmployee] consultant
      INNER JOIN [dbo].[SecureCareEmployee] l1
        ON l1.employeeNumber = consultant.employeeNumber AND l1.awardType = 'Level 1'
      INNER JOIN [dbo].[SecureCareEmployee] l2
        ON l2.employeeNumber = consultant.employeeNumber AND l2.awardType = 'Level 2'
      LEFT JOIN [dbo].[SecureCareEmployee] l3
        ON l3.employeeNumber = consultant.employeeNumber AND l3.awardType = 'Level 3'
      WHERE consultant.awardType = 'Consultant'
        AND (l1.secureCareAwarded = 1 OR l1.secureCareAwardedDate IS NOT NULL)
        AND (l2.secureCareAwarded = 1 OR l2.secureCareAwardedDate IS NOT NULL)
        -- Level 3 awarded is optional for Consultant (no check needed)
        AND (consultant.secureCareAwarded = 0 OR consultant.secureCareAwarded IS NULL)
        AND consultant.secureCareAwardedDate IS NULL
        AND consultant.[session#1] IS NOT NULL
        AND consultant.[session#1] != ''
        AND consultant.[session#2] IS NOT NULL
        AND consultant.[session#2] != ''
        AND consultant.[session#3] IS NOT NULL
        AND consultant.[session#3] != ''
    `;
    
    const countRequest = pool.request();
    
    if (filters.facility && filters.facility !== 'all') {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      if (facilities.length === 1) {
        countQuery += ` AND consultant.facility = @facilityCount0`;
        countRequest.input('facilityCount0', sql.VarChar, facilities[0]);
      } else if (facilities.length > 1) {
        const facilityParams = facilities.map((f, i) => `@facilityCount${i}`).join(', ');
        countQuery += ` AND consultant.facility IN (${facilityParams})`;
        facilities.forEach((f, i) => {
          countRequest.input(`facilityCount${i}`, sql.VarChar, f);
        });
      }
    }
    
    if (filters.area && filters.area !== 'all') {
      countQuery += ` AND consultant.area = @area`;
      countRequest.input('area', sql.VarChar, filters.area);
    }
    
    if (filters.search) {
      countQuery += ` AND (consultant.name LIKE @search OR consultant.employeeNumber LIKE @search)`;
      countRequest.input('search', sql.VarChar, `%${filters.search}%`);
    }
    
    if (filters.jobTitle && filters.jobTitle !== 'all') {
      countQuery += ` AND consultant.staffRoll = @jobTitle`;
      countRequest.input('jobTitle', sql.VarChar, filters.jobTitle);
    }
    
    let countResult;
    try {
      countResult = await countRequest.query(countQuery);
    } catch (error) {
      console.error('Error getting Consultant count:', error);
      throw error;
    }
    const total = countResult.recordset[0].total;
    
    // Transform results to match the aggregated format
    const employees = result.recordset.map(record => ({
      employeeId: record.employeeId,
      employeeNumber: record.employeeNumber,
      name: record.name,
      facility: record.facility,
      area: record.area,
      staffRoll: record.staffRoll,
      // Level 1
      level1AssignedDate: record.level1AssignedDate,
      level1CompletedDate: record.level1CompletedDate,
      level1SecureCareAwarded: record.level1SecureCareAwarded,
      level1SecureCareAwardedDate: record.level1SecureCareAwardedDate,
      // Level 2
      level2ConferenceCompleted: record.level2ConferenceCompleted,
      level2Notes: record.level2Notes,
      level2AdvisorId: record.level2AdvisorId,
      level2AdvisorName: record.level2AdvisorName,
      level2StandingVideo: record.level2StandingVideo,
      level2SleepingVideo: record.level2SleepingVideo,
      level2FeedGradVideo: record.level2FeedGradVideo,
      level2SecureCareAwarded: record.level2SecureCareAwarded,
      level2SecureCareAwardedDate: record.level2SecureCareAwardedDate,
      level2Awaiting: record.level2Awaiting,
      // Level 3
      level3ConferenceCompleted: record.level3ConferenceCompleted,
      level3Notes: record.level3Notes,
      level3AdvisorId: record.level3AdvisorId,
      level3AdvisorName: record.level3AdvisorName,
      level3StandingVideo: record.level3StandingVideo,
      level3NoHandnoSpeak: record.level3NoHandnoSpeak,
      level3SleepingVideo: record.level3SleepingVideo,
      level3SecureCareAwarded: record.level3SecureCareAwarded,
      level3SecureCareAwardedDate: record.level3SecureCareAwardedDate,
      level3Awaiting: record.level3Awaiting,
      // Consultant
      consultantConferenceCompleted: record.consultantConferenceCompleted,
      consultantNotes: record.consultantNotes,
      consultantAdvisorId: record.consultantAdvisorId,
      consultantAdvisorName: record.consultantAdvisorName,
      consultantSession1: record.consultantSession1,
      consultantSession2: record.consultantSession2,
      consultantSession3: record.consultantSession3,
      consultantSecureCareAwarded: record.consultantSecureCareAwarded,
      consultantSecureCareAwardedDate: record.consultantSecureCareAwardedDate,
      consultantAwaiting: record.consultantAwaiting,
      // Coach (null)
      coachConferenceCompleted: null,
      coachSession1: null,
      coachSession2: null,
      coachSession3: null,
      coachSecureCareAwarded: null,
      coachSecureCareAwardedDate: null,
      coachAwaiting: null
    }));
    
    return {
      employees: employees,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalEmployees: total,
        itemsPerPage: limit
      }
    };
  }

  // Get employees ready for Coach award (Consultant awarded, all Coach sessions completed, Coach not awarded)
  async getEmployeesReadyForCoachAward(filters = {}) {
    const pool = await getPool();
    
    let query = `
      SELECT DISTINCT
        coach.employeeNumber,
        coach.employeeId,
        coach.[name],
        coach.[area],
        coach.[facility],
        coach.staffRoll,
        CONVERT(varchar(10), l1.assignedDate, 120) AS level1AssignedDate,
        CONVERT(varchar(10), l1.completedDate, 120) AS level1CompletedDate,
        l1.secureCareAwarded AS level1SecureCareAwarded,
        CONVERT(varchar(10), l1.secureCareAwardedDate, 120) AS level1SecureCareAwardedDate,
        CONVERT(varchar(10), l2.conferenceCompleted, 120) AS level2ConferenceCompleted,
        l2.notes AS level2Notes,
        l2.advisorId AS level2AdvisorId,
        a2.firstName + ' ' + ISNULL(a2.lastName, '') AS level2AdvisorName,
        CONVERT(varchar(10), l2.standingVideo, 120) AS level2StandingVideo,
        CONVERT(varchar(10), l2.sleepingVideo, 120) AS level2SleepingVideo,
        CONVERT(varchar(10), l2.feedGradVideo, 120) AS level2FeedGradVideo,
        l2.secureCareAwarded AS level2SecureCareAwarded,
        CONVERT(varchar(10), l2.secureCareAwardedDate, 120) AS level2SecureCareAwardedDate,
        l2.awaiting AS level2Awaiting,
        CONVERT(varchar(10), l3.conferenceCompleted, 120) AS level3ConferenceCompleted,
        l3.notes AS level3Notes,
        l3.advisorId AS level3AdvisorId,
        a3.firstName + ' ' + ISNULL(a3.lastName, '') AS level3AdvisorName,
        CONVERT(varchar(10), l3.standingVideo, 120) AS level3StandingVideo,
        CONVERT(varchar(10), l3.noHandnoSpeak, 120) AS level3NoHandnoSpeak,
        CONVERT(varchar(10), l3.sleepingVideo, 120) AS level3SleepingVideo,
        l3.secureCareAwarded AS level3SecureCareAwarded,
        CONVERT(varchar(10), l3.secureCareAwardedDate, 120) AS level3SecureCareAwardedDate,
        l3.awaiting AS level3Awaiting,
        CONVERT(varchar(10), consultant.conferenceCompleted, 120) AS consultantConferenceCompleted,
        consultant.notes AS consultantNotes,
        consultant.advisorId AS consultantAdvisorId,
        aConsultant.firstName + ' ' + ISNULL(aConsultant.lastName, '') AS consultantAdvisorName,
        CONVERT(varchar(10), consultant.[session#1], 120) AS consultantSession1,
        CONVERT(varchar(10), consultant.[session#2], 120) AS consultantSession2,
        CONVERT(varchar(10), consultant.[session#3], 120) AS consultantSession3,
        consultant.secureCareAwarded AS consultantSecureCareAwarded,
        CONVERT(varchar(10), consultant.secureCareAwardedDate, 120) AS consultantSecureCareAwardedDate,
        consultant.awaiting AS consultantAwaiting,
        CONVERT(varchar(10), coach.conferenceCompleted, 120) AS coachConferenceCompleted,
        coach.notes AS coachNotes,
        coach.advisorId AS coachAdvisorId,
        aCoach.firstName + ' ' + ISNULL(aCoach.lastName, '') AS coachAdvisorName,
        CONVERT(varchar(10), coach.[session#1], 120) AS coachSession1,
        CONVERT(varchar(10), coach.[session#2], 120) AS coachSession2,
        CONVERT(varchar(10), coach.[session#3], 120) AS coachSession3,
        coach.secureCareAwarded AS coachSecureCareAwarded,
        CONVERT(varchar(10), coach.secureCareAwardedDate, 120) AS coachSecureCareAwardedDate,
        coach.awaiting AS coachAwaiting
      FROM [dbo].[SecureCareEmployee] coach
      INNER JOIN [dbo].[SecureCareEmployee] l1
        ON l1.employeeNumber = coach.employeeNumber AND l1.awardType = 'Level 1'
      INNER JOIN [dbo].[SecureCareEmployee] l2
        ON l2.employeeNumber = coach.employeeNumber AND l2.awardType = 'Level 2'
      LEFT JOIN [dbo].[SecureCareEmployee] l3
        ON l3.employeeNumber = coach.employeeNumber AND l3.awardType = 'Level 3'
      LEFT JOIN [dbo].[SecureCareEmployee] consultant
        ON consultant.employeeNumber = coach.employeeNumber AND consultant.awardType = 'Consultant'
      LEFT JOIN dbo.Advisor a2 ON l2.advisorId = a2.advisorId
      LEFT JOIN dbo.Advisor a3 ON l3.advisorId = a3.advisorId
      LEFT JOIN dbo.Advisor aConsultant ON consultant.advisorId = aConsultant.advisorId
      LEFT JOIN dbo.Advisor aCoach ON coach.advisorId = aCoach.advisorId
      WHERE coach.awardType = 'Coach'
        AND (l1.secureCareAwarded = 1 OR l1.secureCareAwardedDate IS NOT NULL)
        AND (l2.secureCareAwarded = 1 OR l2.secureCareAwardedDate IS NOT NULL)
        -- Level 3 awarded is optional for Coach
        AND (coach.secureCareAwarded = 0 OR coach.secureCareAwarded IS NULL)
        AND coach.secureCareAwardedDate IS NULL
        AND coach.[session#1] IS NOT NULL
        AND coach.[session#2] IS NOT NULL
        AND coach.[session#3] IS NOT NULL
    `;
    
    const request = pool.request();
    
    // Apply additional filters
    if (filters.facility && filters.facility !== 'all') {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      if (facilities.length === 1) {
        query += ` AND coach.facility = @facility0`;
        request.input('facility0', sql.VarChar, facilities[0]);
      } else if (facilities.length > 1) {
        const facilityParams = facilities.map((f, i) => `@facility${i}`).join(', ');
        query += ` AND coach.facility IN (${facilityParams})`;
        facilities.forEach((f, i) => {
          request.input(`facility${i}`, sql.VarChar, f);
        });
      }
    }
    
    if (filters.area && filters.area !== 'all') {
      query += ` AND coach.area = @area`;
      request.input('area', sql.VarChar, filters.area);
    }
    
    if (filters.search) {
      query += ` AND (coach.name LIKE @search OR coach.employeeNumber LIKE @search)`;
      request.input('search', sql.VarChar, `%${filters.search}%`);
    }
    
    if (filters.jobTitle && filters.jobTitle !== 'all') {
      query += ` AND coach.staffRoll = @jobTitle`;
      request.input('jobTitle', sql.VarChar, filters.jobTitle);
    }
    
    // Add sorting - must use columns from SELECT DISTINCT (coach, not consultant)
    const sortBy = filters.sortBy || 'area';
    const sortOrder = normalizeSortOrder(filters.sortOrder);
    switch (sortBy) {
      case 'name':
        query += ` ORDER BY coach.[name] ${sortOrder.toUpperCase()}`;
        break;
      case 'facility':
        query += ` ORDER BY coach.[facility] ${sortOrder.toUpperCase()}`;
        break;
      case 'area':
        query += ` ORDER BY coach.[area] ${sortOrder.toUpperCase()}, coach.[name] ${sortOrder.toUpperCase()}`;
        break;
      case 'employeeId':
        query += ` ORDER BY coach.employeeNumber ${sortOrder.toUpperCase()}`;
        break;
      default:
        query += ` ORDER BY coach.[area] ${sortOrder.toUpperCase()}, coach.[name] ${sortOrder.toUpperCase()}`;
    }
    
    // Add pagination - allow large limits to show all data
    const page = parseInt(filters.page) || 1;
    const requestedLimit = parseInt(filters.limit) || 1000;
    // Allow up to 10,000 records to show all data
    const limit = requestedLimit > 10000 ? 10000 : requestedLimit;
    const offset = (page - 1) * limit;
    query += ` OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
    
    let result;
    try {
      result = await request.query(query);
    } catch (error) {
      console.error('Error in getEmployeesReadyForCoachAward query:', error);
      console.error('Query:', query);
      throw error;
    }
    
    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT coach.employeeNumber) as total
      FROM [dbo].[SecureCareEmployee] coach
      INNER JOIN [dbo].[SecureCareEmployee] l1
        ON l1.employeeNumber = coach.employeeNumber AND l1.awardType = 'Level 1'
      INNER JOIN [dbo].[SecureCareEmployee] l2
        ON l2.employeeNumber = coach.employeeNumber AND l2.awardType = 'Level 2'
      LEFT JOIN [dbo].[SecureCareEmployee] l3
        ON l3.employeeNumber = coach.employeeNumber AND l3.awardType = 'Level 3'
      WHERE coach.awardType = 'Coach'
        AND (l1.secureCareAwarded = 1 OR l1.secureCareAwardedDate IS NOT NULL)
        AND (l2.secureCareAwarded = 1 OR l2.secureCareAwardedDate IS NOT NULL)
        -- Level 3 awarded is optional for Coach
        AND (coach.secureCareAwarded = 0 OR coach.secureCareAwarded IS NULL)
        AND coach.secureCareAwardedDate IS NULL
        AND coach.[session#1] IS NOT NULL
        AND coach.[session#2] IS NOT NULL
        AND coach.[session#3] IS NOT NULL
    `;
    
    const countRequest = pool.request();
    
    if (filters.facility && filters.facility !== 'all') {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      if (facilities.length === 1) {
        countQuery += ` AND coach.facility = @facilityCount0`;
        countRequest.input('facilityCount0', sql.VarChar, facilities[0]);
      } else if (facilities.length > 1) {
        const facilityParams = facilities.map((f, i) => `@facilityCount${i}`).join(', ');
        countQuery += ` AND coach.facility IN (${facilityParams})`;
        facilities.forEach((f, i) => {
          countRequest.input(`facilityCount${i}`, sql.VarChar, f);
        });
      }
    }
    
    if (filters.area && filters.area !== 'all') {
      countQuery += ` AND coach.area = @area`;
      countRequest.input('area', sql.VarChar, filters.area);
    }
    
    if (filters.search) {
      countQuery += ` AND (coach.name LIKE @search OR coach.employeeNumber LIKE @search)`;
      countRequest.input('search', sql.VarChar, `%${filters.search}%`);
    }
    
    if (filters.jobTitle && filters.jobTitle !== 'all') {
      countQuery += ` AND coach.staffRoll = @jobTitle`;
      countRequest.input('jobTitle', sql.VarChar, filters.jobTitle);
    }
    
    let countResult;
    try {
      countResult = await countRequest.query(countQuery);
    } catch (error) {
      console.error('Error getting Coach count:', error);
      throw error;
    }
    const total = countResult.recordset[0].total;
    
    // Transform results to match the aggregated format
    const employees = result.recordset.map(record => ({
      employeeId: record.employeeId,
      employeeNumber: record.employeeNumber,
      name: record.name,
      facility: record.facility,
      area: record.area,
      staffRoll: record.staffRoll,
      // Level 1
      level1AssignedDate: record.level1AssignedDate,
      level1CompletedDate: record.level1CompletedDate,
      level1SecureCareAwarded: record.level1SecureCareAwarded,
      level1SecureCareAwardedDate: record.level1SecureCareAwardedDate,
      // Level 2
      level2ConferenceCompleted: record.level2ConferenceCompleted,
      level2Notes: record.level2Notes,
      level2AdvisorId: record.level2AdvisorId,
      level2AdvisorName: record.level2AdvisorName,
      level2StandingVideo: record.level2StandingVideo,
      level2SleepingVideo: record.level2SleepingVideo,
      level2FeedGradVideo: record.level2FeedGradVideo,
      level2SecureCareAwarded: record.level2SecureCareAwarded,
      level2SecureCareAwardedDate: record.level2SecureCareAwardedDate,
      level2Awaiting: record.level2Awaiting,
      // Level 3
      level3ConferenceCompleted: record.level3ConferenceCompleted,
      level3Notes: record.level3Notes,
      level3AdvisorId: record.level3AdvisorId,
      level3AdvisorName: record.level3AdvisorName,
      level3StandingVideo: record.level3StandingVideo,
      level3NoHandnoSpeak: record.level3NoHandnoSpeak,
      level3SleepingVideo: record.level3SleepingVideo,
      level3SecureCareAwarded: record.level3SecureCareAwarded,
      level3SecureCareAwardedDate: record.level3SecureCareAwardedDate,
      level3Awaiting: record.level3Awaiting,
      // Consultant
      consultantConferenceCompleted: record.consultantConferenceCompleted,
      consultantNotes: record.consultantNotes,
      consultantAdvisorId: record.consultantAdvisorId,
      consultantAdvisorName: record.consultantAdvisorName,
      consultantSession1: record.consultantSession1,
      consultantSession2: record.consultantSession2,
      consultantSession3: record.consultantSession3,
      consultantSecureCareAwarded: record.consultantSecureCareAwarded,
      consultantSecureCareAwardedDate: record.consultantSecureCareAwardedDate,
      consultantAwaiting: record.consultantAwaiting,
      // Coach
      coachConferenceCompleted: record.coachConferenceCompleted,
      coachNotes: record.coachNotes,
      coachAdvisorId: record.coachAdvisorId,
      coachAdvisorName: record.coachAdvisorName,
      coachSession1: record.coachSession1,
      coachSession2: record.coachSession2,
      coachSession3: record.coachSession3,
      coachSecureCareAwarded: record.coachSecureCareAwarded,
      coachSecureCareAwardedDate: record.coachSecureCareAwardedDate,
      coachAwaiting: record.coachAwaiting
    }));
    
    return {
      employees: employees,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalEmployees: total,
        itemsPerPage: limit
      }
    };
  }
}

module.exports = new SecureCareService();
