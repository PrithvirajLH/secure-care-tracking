const { getPool, sql } = require('../config/database');

// Simple in-memory cache for analytics (for production, consider Redis)
const analyticsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
    if (filters.facility && filters.facility !== 'all') {
      query += ` ${isAllLevels ? 'WHERE' : 'AND'} e.facility = @facility`;
      request.input('facility', sql.VarChar, filters.facility);
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
        const column = fieldMap[df];
        if (column) {
          query += ` ${query.includes('WHERE') ? 'AND' : 'WHERE'} CAST(${column} AS DATE) = @filterDate`;
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
    const limit = Math.min(parseInt(filters.limit) || 50, 100); // Max 100 records per page
    const offset = (page - 1) * limit;
    
    // Add sorting support - default to name sorting
    const sortBy = filters.sortBy || 'name';
    const sortOrder = filters.sortOrder || 'asc';
    
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
    
    if (filters.facility && filters.facility !== 'all') {
      countQuery += ` ${countQuery.includes('WHERE') ? 'AND' : 'WHERE'} e.facility = @facility`;
      countRequest.input('facility', sql.VarChar, filters.facility);
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
        const column = fieldMap[df];
        if (column) {
          countQuery += ` ${countQuery.includes('WHERE') ? 'AND' : 'WHERE'} CAST(${column} AS DATE) = @filterDate`;
          countRequest.input('filterDate', sql.Date, date);
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
        FORMAT(e.assignedDate, 'yyyy-MM-dd') AS assignedDate,
        FORMAT(e.completedDate, 'yyyy-MM-dd') AS completedDate,
        FORMAT(e.conferenceCompleted, 'yyyy-MM-dd') AS conferenceCompleted,
        FORMAT(e.scheduleStandingVideo, 'yyyy-MM-dd') AS scheduleStandingVideo,
        FORMAT(e.standingVideo, 'yyyy-MM-dd') AS standingVideo,
        FORMAT(e.scheduleSleepingVideo, 'yyyy-MM-dd') AS scheduleSleepingVideo,
        FORMAT(e.sleepingVideo, 'yyyy-MM-dd') AS sleepingVideo,
        FORMAT(e.scheduleFeedGradVideo, 'yyyy-MM-dd') AS scheduleFeedGradVideo,
        FORMAT(e.feedGradVideo, 'yyyy-MM-dd') AS feedGradVideo,
        FORMAT(e.schedulenoHandnoSpeak, 'yyyy-MM-dd') AS schedulenoHandnoSpeak,
        FORMAT(e.noHandnoSpeak, 'yyyy-MM-dd') AS noHandnoSpeak,
        FORMAT(e.[scheduleSession#1], 'yyyy-MM-dd') AS scheduleSession1,
        FORMAT(e.[session#1], 'yyyy-MM-dd') AS session1,
        FORMAT(e.[scheduleSession#2], 'yyyy-MM-dd') AS scheduleSession2,
        FORMAT(e.[session#2], 'yyyy-MM-dd') AS session2,
        FORMAT(e.[scheduleSession#3], 'yyyy-MM-dd') AS scheduleSession3,
        FORMAT(e.[session#3], 'yyyy-MM-dd') AS session3,
        e.secureCareAwarded,
        FORMAT(e.secureCareAwardedDate, 'yyyy-MM-dd') AS secureCareAwardedDate,
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
        FORMAT(e.assignedDate, 'yyyy-MM-dd') AS assignedDate,
        FORMAT(e.completedDate, 'yyyy-MM-dd') AS completedDate,
        FORMAT(e.conferenceCompleted, 'yyyy-MM-dd') AS conferenceCompleted,
        FORMAT(e.scheduleStandingVideo, 'yyyy-MM-dd') AS scheduleStandingVideo,
        FORMAT(e.standingVideo, 'yyyy-MM-dd') AS standingVideo,
        FORMAT(e.scheduleSleepingVideo, 'yyyy-MM-dd') AS scheduleSleepingVideo,
        FORMAT(e.sleepingVideo, 'yyyy-MM-dd') AS sleepingVideo,
        FORMAT(e.scheduleFeedGradVideo, 'yyyy-MM-dd') AS scheduleFeedGradVideo,
        FORMAT(e.feedGradVideo, 'yyyy-MM-dd') AS feedGradVideo,
        FORMAT(e.schedulenoHandnoSpeak, 'yyyy-MM-dd') AS schedulenoHandnoSpeak,
        FORMAT(e.noHandnoSpeak, 'yyyy-MM-dd') AS noHandnoSpeak,
        FORMAT(e.[scheduleSession#1], 'yyyy-MM-dd') AS scheduleSession1,
        FORMAT(e.[session#1], 'yyyy-MM-dd') AS session1,
        FORMAT(e.[scheduleSession#2], 'yyyy-MM-dd') AS scheduleSession2,
        FORMAT(e.[session#2], 'yyyy-MM-dd') AS session2,
        FORMAT(e.[scheduleSession#3], 'yyyy-MM-dd') AS scheduleSession3,
        FORMAT(e.[session#3], 'yyyy-MM-dd') AS session3,
        e.secureCareAwarded,
        FORMAT(e.secureCareAwardedDate, 'yyyy-MM-dd') AS secureCareAwardedDate,
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
    if (filters.facility && filters.facility !== 'all') {
      query += ` AND e.facility = @facility`;
      request.input('facility', sql.VarChar, filters.facility);
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
    const limit = Math.min(parseInt(filters.limit) || 50, 100); // Max 100 records per page
    const offset = (page - 1) * limit;
    
      // Add sorting support - default to name sorting
      const sortBy = filters.sortBy || 'name';
      const sortOrder = filters.sortOrder || 'asc';
    
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
      if (filters.facility && filters.facility !== 'all') {
        countQuery += ` AND e.facility = @facility`;
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
          FORMAT(e.assignedDate, 'yyyy-MM-dd') AS assignedDate,
          FORMAT(e.completedDate, 'yyyy-MM-dd') AS completedDate,
          FORMAT(e.conferenceCompleted, 'yyyy-MM-dd') AS conferenceCompleted,
          FORMAT(e.scheduleStandingVideo, 'yyyy-MM-dd') AS scheduleStandingVideo,
          FORMAT(e.standingVideo, 'yyyy-MM-dd') AS standingVideo,
          FORMAT(e.scheduleSleepingVideo, 'yyyy-MM-dd') AS scheduleSleepingVideo,
          FORMAT(e.sleepingVideo, 'yyyy-MM-dd') AS sleepingVideo,
          FORMAT(e.scheduleFeedGradVideo, 'yyyy-MM-dd') AS scheduleFeedGradVideo,
          FORMAT(e.feedGradVideo, 'yyyy-MM-dd') AS feedGradVideo,
          FORMAT(e.schedulenoHandnoSpeak, 'yyyy-MM-dd') AS schedulenoHandnoSpeak,
          FORMAT(e.noHandnoSpeak, 'yyyy-MM-dd') AS noHandnoSpeak,
          FORMAT(e.[scheduleSession#1], 'yyyy-MM-dd') AS scheduleSession1,
          FORMAT(e.[session#1], 'yyyy-MM-dd') AS session1,
          FORMAT(e.[scheduleSession#2], 'yyyy-MM-dd') AS scheduleSession2,
          FORMAT(e.[session#2], 'yyyy-MM-dd') AS session2,
          FORMAT(e.[scheduleSession#3], 'yyyy-MM-dd') AS scheduleSession3,
          FORMAT(e.[session#3], 'yyyy-MM-dd') AS session3,
          e.secureCareAwarded,
          FORMAT(e.secureCareAwardedDate, 'yyyy-MM-dd') AS secureCareAwardedDate,
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
    if (filters.facility && filters.facility !== 'all') {
      request.input('facility', sql.VarChar, filters.facility);
      query = query.replace('WHERE 1=1', 'WHERE 1=1 AND e.facility = @facility');
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
    const limit = Math.min(parseInt(filters.limit) || 50, 100); // Max 100 records per page
    const offset = (page - 1) * limit;
    
    // Add sorting support - default to name sorting
    const sortBy = filters.sortBy || 'name';
    const sortOrder = filters.sortOrder || 'asc';
    
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
    
    if (filters.facility && filters.facility !== 'all') {
      countRequest.input('facility', sql.VarChar, filters.facility);
      countQuery += ` AND e.facility = @facility`;
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
        FORMAT(e.assignedDate, 'yyyy-MM-dd') AS assignedDate,
        FORMAT(e.completedDate, 'yyyy-MM-dd') AS completedDate,
        FORMAT(e.conferenceCompleted, 'yyyy-MM-dd') AS conferenceCompleted,
        FORMAT(e.scheduleStandingVideo, 'yyyy-MM-dd') AS scheduleStandingVideo,
        FORMAT(e.standingVideo, 'yyyy-MM-dd') AS standingVideo,
        FORMAT(e.scheduleSleepingVideo, 'yyyy-MM-dd') AS scheduleSleepingVideo,
        FORMAT(e.sleepingVideo, 'yyyy-MM-dd') AS sleepingVideo,
        FORMAT(e.scheduleFeedGradVideo, 'yyyy-MM-dd') AS scheduleFeedGradVideo,
        FORMAT(e.feedGradVideo, 'yyyy-MM-dd') AS feedGradVideo,
        FORMAT(e.schedulenoHandnoSpeak, 'yyyy-MM-dd') AS schedulenoHandnoSpeak,
        FORMAT(e.noHandnoSpeak, 'yyyy-MM-dd') AS noHandnoSpeak,
        FORMAT(e.[scheduleSession#1], 'yyyy-MM-dd') AS scheduleSession1,
        FORMAT(e.[session#1], 'yyyy-MM-dd') AS session1,
        FORMAT(e.[scheduleSession#2], 'yyyy-MM-dd') AS scheduleSession2,
        FORMAT(e.[session#2], 'yyyy-MM-dd') AS session2,
        FORMAT(e.[scheduleSession#3], 'yyyy-MM-dd') AS scheduleSession3,
        FORMAT(e.[session#3], 'yyyy-MM-dd') AS session3,
        e.secureCareAwarded,
        FORMAT(e.secureCareAwardedDate, 'yyyy-MM-dd') AS secureCareAwardedDate,
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
    
    if (filters.facility && filters.facility !== 'all') {
      conditions.push('e.facility = @facility');
      request.input('facility', sql.VarChar, filters.facility);
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
      
      if (filters.facility && filters.facility !== 'all') {
        conditions.push('e.facility = @facility');
        request.input('facility', sql.VarChar, filters.facility);
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
      if (filters.facility && filters.facility !== 'all') {
        inProgressConditions.push('e.facility = @facility');
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
    
    if (filters.facility && filters.facility !== 'all') {
      conditions.push('e.facility = @facility');
      request.input('facility', sql.VarChar, filters.facility);
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
      AND e.awardType IS NOT NULL
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
      
      if (filters.facility && filters.facility !== 'all') {
        conditions.push('e.facility = @facility');
        request.input('facility', sql.VarChar, filters.facility);
      }
      
      if (filters.area && filters.area !== 'all') {
        conditions.push('e.area = @area');
        request.input('area', sql.VarChar, filters.area);
      }
      
      if (filters.level && filters.level !== 'all') {
        conditions.push('e.awardType = @level');
        request.input('level', sql.VarChar, filters.level);
      }
      
      // Add the date condition to the where clause
      conditions.push('e.secureCareAwardedDate IS NOT NULL');
      
      if (conditions.length > 0) {
        whereClause = 'WHERE ' + conditions.join(' AND ');
      }
      
      const query = `
        SELECT TOP 10
          e.name as employee,
          e.facility,
          e.awardType as achievement,
          e.secureCareAwardedDate as date,
          DATEDIFF(day, e.assignedDate, e.secureCareAwardedDate) as timeToComplete
        FROM dbo.SecureCareEmployee e
        ${whereClause}
        ORDER BY e.secureCareAwardedDate DESC
      `;
      
      const result = await request.query(query);
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
    
    if (filters.facility && filters.facility !== 'all') {
      conditions.push('e.facility = @facility');
      request.input('facility', sql.VarChar, filters.facility);
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
    if (filters.facility && filters.facility !== 'all') {
      conditions.push('e.facility = @facility');
      request.input('facility', sql.VarChar, filters.facility);
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
      WITH RankedEmployees AS (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY e.employeeNumber, e.awardType 
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
          ) as rn
        FROM dbo.SecureCareEmployee e
        ${where}
      )
      SELECT 
        -- completed: awarded within range (or awarded with no range specified)
        SUM(CASE WHEN secureCareAwarded = 1 AND (
          (@startDate IS NULL AND @endDate IS NULL) OR
          (secureCareAwardedDate IS NOT NULL AND secureCareAwardedDate BETWEEN @startDate AND @endDate)
        ) THEN 1 ELSE 0 END) AS completed,

        -- scheduled: any schedule date within range and not completed
        SUM(CASE WHEN secureCareAwarded = 0 AND (
          (@startDate IS NULL AND @endDate IS NULL) OR
          (scheduleStandingVideo BETWEEN @startDate AND @endDate) OR
          (scheduleSleepingVideo BETWEEN @startDate AND @endDate) OR
          (scheduleFeedGradVideo BETWEEN @startDate AND @endDate) OR
          (schedulenoHandnoSpeak BETWEEN @startDate AND @endDate) OR
          ([scheduleSession#1] BETWEEN @startDate AND @endDate) OR
          ([scheduleSession#2] BETWEEN @startDate AND @endDate) OR
          ([scheduleSession#3] BETWEEN @startDate AND @endDate)
        ) THEN 1 ELSE 0 END) AS scheduled,

        -- inProgress: conference completed and approved (not awaiting)
        SUM(CASE WHEN conferenceCompleted IS NOT NULL AND conferenceCompleted != '' AND 
          (awaiting IS NULL OR awaiting = 0) AND (
          (@startDate IS NULL AND @endDate IS NULL) OR
          (conferenceCompleted BETWEEN @startDate AND @endDate)
        ) THEN 1 ELSE 0 END) AS inProgress,

        -- awaiting: conference completed in range and awaiting=1
        SUM(CASE WHEN awaiting = 1 AND (
          (@startDate IS NULL AND @endDate IS NULL) OR
          (conferenceCompleted BETWEEN @startDate AND @endDate)
        ) THEN 1 ELSE 0 END) AS awaiting,

        -- rejected: conference completed in range and awaiting IS NULL
        SUM(CASE WHEN awaiting IS NULL AND (
          (@startDate IS NULL AND @endDate IS NULL) OR
          (conferenceCompleted BETWEEN @startDate AND @endDate)
        ) THEN 1 ELSE 0 END) AS rejected
      FROM RankedEmployees
      WHERE rn = 1
    `;

    const result = await request.query(query);

    // Breakdown by level with deduplication
    const breakdownQuery = `
      WITH RankedEmployees AS (
        SELECT *,
          ROW_NUMBER() OVER (
            PARTITION BY e.employeeNumber, e.awardType 
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
          ) as rn
        FROM dbo.SecureCareEmployee e
        ${where}
      )
      SELECT awardType as level,
        SUM(CASE WHEN secureCareAwarded = 1 AND (
          (@startDate IS NULL AND @endDate IS NULL) OR
          (secureCareAwardedDate IS NOT NULL AND secureCareAwardedDate BETWEEN @startDate AND @endDate)
        ) THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN conferenceCompleted IS NOT NULL AND conferenceCompleted != '' AND 
          (awaiting IS NULL OR awaiting = 0) AND (
          (@startDate IS NULL AND @endDate IS NULL) OR
          (conferenceCompleted BETWEEN @startDate AND @endDate)
        ) THEN 1 ELSE 0 END) AS inProgress
      FROM RankedEmployees
      WHERE rn = 1
      GROUP BY awardType
    `;

    const breakdownReq = pool.request();
    if (filters.facility && filters.facility !== 'all') breakdownReq.input('facility', sql.VarChar, filters.facility);
    if (filters.area && filters.area !== 'all') breakdownReq.input('area', sql.VarChar, filters.area);
    if (filters.level && filters.level !== 'all') breakdownReq.input('level', sql.VarChar, filters.level);
    breakdownReq.input('startDate', sql.Date, filters.startDate || null);
    breakdownReq.input('endDate', sql.Date, filters.endDate || null);

    const byLevel = await breakdownReq.query(breakdownQuery);

    return {
      totals: result.recordset[0] || { completed: 0, scheduled: 0, inProgress: 0, awaiting: 0, rejected: 0 },
      byLevel: byLevel.recordset || []
    };
  }
}

module.exports = new SecureCareService();
