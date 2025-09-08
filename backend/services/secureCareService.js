const { getPool, sql } = require('../config/database');

class SecureCareService {
  
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
      
      // Status filter - this is complex as it depends on awardType and completion status
      if (filters.status && filters.status !== 'all') {
        let statusCondition = '';
        switch (filters.status) {
          case 'Not Started':
            statusCondition = `(e.awardType IS NULL OR e.assignedDate IS NULL)`;
            break;
          case 'Level 1 In Progress':
            statusCondition = `(e.awardType = 'Level 1' AND e.secureCareAwarded = 0 AND (e.awaiting IS NULL OR e.awaiting = 0))`;
            break;
          case 'Level 1':
            statusCondition = `(e.awardType = 'Level 1' AND e.secureCareAwarded = 1)`;
            break;
          case 'Level 2 In Progress':
            statusCondition = `(e.awardType = 'Level 2' AND e.secureCareAwarded = 0 AND (e.awaiting IS NULL OR e.awaiting = 0))`;
            break;
          case 'Level 2':
            statusCondition = `(e.awardType = 'Level 2' AND e.secureCareAwarded = 1)`;
            break;
          case 'Level 3 In Progress':
            statusCondition = `(e.awardType = 'Level 3' AND e.secureCareAwarded = 0 AND (e.awaiting IS NULL OR e.awaiting = 0))`;
            break;
          case 'Level 3':
            statusCondition = `(e.awardType = 'Level 3' AND e.secureCareAwarded = 1)`;
            break;
          case 'Consultant In Progress':
            statusCondition = `(e.awardType = 'Consultant' AND e.secureCareAwarded = 0 AND (e.awaiting IS NULL OR e.awaiting = 0))`;
            break;
          case 'Consultant':
            statusCondition = `(e.awardType = 'Consultant' AND e.secureCareAwarded = 1)`;
            break;
          case 'Coach In Progress':
            statusCondition = `(e.awardType = 'Coach' AND e.secureCareAwarded = 0 AND (e.awaiting IS NULL OR e.awaiting = 0))`;
            break;
          case 'Coach':
            statusCondition = `(e.awardType = 'Coach' AND e.secureCareAwarded = 1)`;
            break;
          case 'Awaiting Approval':
            statusCondition = `(e.awaiting = 1)`;
            break;
          case 'Conference Rejected':
            statusCondition = `(e.awaiting IS NULL)`;
            break;
        }
        if (statusCondition) {
          query += ` ${query.includes('WHERE') ? 'AND' : 'WHERE'} ${statusCondition}`;
        }
      }
      
      // Add pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const offset = (page - 1) * limit;
    
    query += ` ORDER BY e.name OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
    
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
      
      // Status filter for count query
      if (filters.status && filters.status !== 'all') {
        let statusCondition = '';
        switch (filters.status) {
          case 'Not Started':
            statusCondition = `(e.awardType IS NULL OR e.assignedDate IS NULL)`;
            break;
          case 'Level 1 In Progress':
            statusCondition = `(e.awardType = 'Level 1' AND e.secureCareAwarded = 0 AND (e.awaiting IS NULL OR e.awaiting = 0))`;
            break;
          case 'Level 1':
            statusCondition = `(e.awardType = 'Level 1' AND e.secureCareAwarded = 1)`;
            break;
          case 'Level 2 In Progress':
            statusCondition = `(e.awardType = 'Level 2' AND e.secureCareAwarded = 0 AND (e.awaiting IS NULL OR e.awaiting = 0))`;
            break;
          case 'Level 2':
            statusCondition = `(e.awardType = 'Level 2' AND e.secureCareAwarded = 1)`;
            break;
          case 'Level 3 In Progress':
            statusCondition = `(e.awardType = 'Level 3' AND e.secureCareAwarded = 0 AND (e.awaiting IS NULL OR e.awaiting = 0))`;
            break;
          case 'Level 3':
            statusCondition = `(e.awardType = 'Level 3' AND e.secureCareAwarded = 1)`;
            break;
          case 'Consultant In Progress':
            statusCondition = `(e.awardType = 'Consultant' AND e.secureCareAwarded = 0 AND (e.awaiting IS NULL OR e.awaiting = 0))`;
            break;
          case 'Consultant':
            statusCondition = `(e.awardType = 'Consultant' AND e.secureCareAwarded = 1)`;
            break;
          case 'Coach In Progress':
            statusCondition = `(e.awardType = 'Coach' AND e.secureCareAwarded = 0 AND (e.awaiting IS NULL OR e.awaiting = 0))`;
            break;
          case 'Coach':
            statusCondition = `(e.awardType = 'Coach' AND e.secureCareAwarded = 1)`;
            break;
          case 'Awaiting Approval':
            statusCondition = `(e.awaiting = 1)`;
            break;
          case 'Conference Rejected':
            statusCondition = `(e.awaiting IS NULL)`;
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
    
    // First, get the highest status for each employee using a subquery
    // Priority: 1) Highest level, 2) In progress (started but not awarded), 3) Completed, 4) Awaiting
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
      WHERE e.employeeId IN (
        SELECT TOP 1 WITH TIES e2.employeeId
        FROM dbo.SecureCareEmployee e2
        WHERE e2.employeeNumber = e.employeeNumber
        ORDER BY 
          CASE 
            WHEN e2.awardType = 'Coach' THEN 1
            WHEN e2.awardType = 'Consultant' THEN 2
            WHEN e2.awardType = 'Level 3' THEN 3
            WHEN e2.awardType = 'Level 2' THEN 4
            WHEN e2.awardType = 'Level 1' THEN 5
            ELSE 99
          END,
          e2.employeeId
      )
    `;
    
    const request = pool.request();
    
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
      if (filters.status && filters.status !== 'all') {
        let statusCondition = '';
        switch (filters.status) {
          case 'Not Started':
            statusCondition = `(e.awardType IS NULL OR e.assignedDate IS NULL)`;
            break;
          case 'Level 1 In Progress':
            statusCondition = `(e.awardType = 'Level 1' AND e.secureCareAwarded = 0 AND (e.awaiting IS NULL OR e.awaiting = 0))`;
            break;
          case 'Level 1':
            statusCondition = `(e.awardType = 'Level 1' AND e.secureCareAwarded = 1)`;
            break;
          case 'Level 2 In Progress':
            statusCondition = `(e.awardType = 'Level 2' AND e.secureCareAwarded = 0 AND (e.awaiting IS NULL OR e.awaiting = 0))`;
            break;
          case 'Level 2':
            statusCondition = `(e.awardType = 'Level 2' AND e.secureCareAwarded = 1)`;
            break;
          case 'Level 3 In Progress':
            statusCondition = `(e.awardType = 'Level 3' AND e.secureCareAwarded = 0 AND (e.awaiting IS NULL OR e.awaiting = 0))`;
            break;
          case 'Level 3':
            statusCondition = `(e.awardType = 'Level 3' AND e.secureCareAwarded = 1)`;
            break;
          case 'Consultant In Progress':
            statusCondition = `(e.awardType = 'Consultant' AND e.secureCareAwarded = 0 AND (e.awaiting IS NULL OR e.awaiting = 0))`;
            break;
          case 'Consultant':
            statusCondition = `(e.awardType = 'Consultant' AND e.secureCareAwarded = 1)`;
            break;
          case 'Coach In Progress':
            statusCondition = `(e.awardType = 'Coach' AND e.secureCareAwarded = 0 AND (e.awaiting IS NULL OR e.awaiting = 0))`;
            break;
          case 'Coach':
            statusCondition = `(e.awardType = 'Coach' AND e.secureCareAwarded = 1)`;
            break;
          case 'Awaiting Approval':
            statusCondition = `(e.awaiting = 1)`;
            break;
          case 'Conference Rejected':
            statusCondition = `(e.awaiting IS NULL)`;
            break;
        }
        if (statusCondition) {
          query += ` AND ${statusCondition}`;
        }
      }
      
      // Add pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const offset = (page - 1) * limit;
    
    query += ` ORDER BY e.name OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY`;
    
    const result = await request.query(query);
    
    // Get total count for unique employees
    let countQuery = `
      SELECT COUNT(DISTINCT e.employeeNumber) as total 
      FROM dbo.SecureCareEmployee e
      WHERE e.employeeId IN (
        SELECT TOP 1 WITH TIES e2.employeeId
        FROM dbo.SecureCareEmployee e2
        WHERE e2.employeeNumber = e.employeeNumber
        ORDER BY 
          CASE 
            WHEN e2.awardType = 'Coach' THEN 1
            WHEN e2.awardType = 'Consultant' THEN 2
            WHEN e2.awardType = 'Level 3' THEN 3
            WHEN e2.awardType = 'Level 2' THEN 4
            WHEN e2.awardType = 'Level 1' THEN 5
            ELSE 99
          END,
          CASE WHEN e2.secureCareAwarded = 1 THEN 0 ELSE 1 END,
          CASE WHEN e2.awaiting = 1 THEN 0 ELSE 1 END,
          e2.employeeId
      )
    `;
    
    const countRequest = pool.request();
    if (!isAllLevels) {
      countRequest.input('level', sql.VarChar, level);
      countQuery += ` AND e.awardType = @level`;
    }
    
    if (filters.facility && filters.facility !== 'all') {
      countQuery += ` AND e.facility = @facility`;
      countRequest.input('facility', sql.VarChar, filters.facility);
    }
    
    if (filters.area && filters.area !== 'all') {
      countQuery += ` AND e.area = @area`;
      countRequest.input('area', sql.VarChar, filters.area);
    }
    
      if (filters.search) {
        countQuery += ` AND (e.name LIKE @search OR e.employeeNumber LIKE @search)`;
        countRequest.input('search', sql.VarChar, `%${filters.search}%`);
      }
      
      if (filters.jobTitle && filters.jobTitle !== 'all') {
        countQuery += ` AND e.staffRoll = @jobTitle`;
        countRequest.input('jobTitle', sql.VarChar, filters.jobTitle);
      }
      
      // Status filter for count query
      if (filters.status && filters.status !== 'all') {
        let statusCondition = '';
        switch (filters.status) {
          case 'Not Started':
            statusCondition = `(e.awardType IS NULL OR e.assignedDate IS NULL)`;
            break;
          case 'Level 1 In Progress':
            statusCondition = `(e.awardType = 'Level 1' AND e.secureCareAwarded = 0 AND (e.awaiting IS NULL OR e.awaiting = 0))`;
            break;
          case 'Level 1':
            statusCondition = `(e.awardType = 'Level 1' AND e.secureCareAwarded = 1)`;
            break;
          case 'Level 2 In Progress':
            statusCondition = `(e.awardType = 'Level 2' AND e.secureCareAwarded = 0 AND (e.awaiting IS NULL OR e.awaiting = 0))`;
            break;
          case 'Level 2':
            statusCondition = `(e.awardType = 'Level 2' AND e.secureCareAwarded = 1)`;
            break;
          case 'Level 3 In Progress':
            statusCondition = `(e.awardType = 'Level 3' AND e.secureCareAwarded = 0 AND (e.awaiting IS NULL OR e.awaiting = 0))`;
            break;
          case 'Level 3':
            statusCondition = `(e.awardType = 'Level 3' AND e.secureCareAwarded = 1)`;
            break;
          case 'Consultant In Progress':
            statusCondition = `(e.awardType = 'Consultant' AND e.secureCareAwarded = 0 AND (e.awaiting IS NULL OR e.awaiting = 0))`;
            break;
          case 'Consultant':
            statusCondition = `(e.awardType = 'Consultant' AND e.secureCareAwarded = 1)`;
            break;
          case 'Coach In Progress':
            statusCondition = `(e.awardType = 'Coach' AND e.secureCareAwarded = 0 AND (e.awaiting IS NULL OR e.awaiting = 0))`;
            break;
          case 'Coach':
            statusCondition = `(e.awardType = 'Coach' AND e.secureCareAwarded = 1)`;
            break;
          case 'Awaiting Approval':
            statusCondition = `(e.awaiting = 1)`;
            break;
          case 'Conference Rejected':
            statusCondition = `(e.awaiting IS NULL)`;
            break;
        }
        if (statusCondition) {
          countQuery += ` AND ${statusCondition}`;
        }
      }
      
      const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].total;
    
    // Debug logging for Sophia Allen
    const sophiaAllen = result.recordset.find(emp => 
      emp.Employee === 'Sophia Allen' || emp.name === 'Sophia Allen'
    );
    if (sophiaAllen) {
      console.log('Sophia Allen backend data:', {
        name: sophiaAllen.Employee || sophiaAllen.name,
        awardType: sophiaAllen.awardType,
        assignedDate: sophiaAllen.assignedDate,
        secureCareAwarded: sophiaAllen.secureCareAwarded,
        awaiting: sophiaAllen.awaiting
      });
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
    console.log('getEmployeeLevelsByEmployeeId: Found employeeNumber:', employeeNumber, 'for employeeId:', employeeId);

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

    console.log('getEmployeeLevelsByEmployeeId: Found records:', levelsResult.recordset.length, 'for employeeNumber:', employeeNumber);
    console.log('getEmployeeLevelsByEmployeeId: Records:', levelsResult.recordset.map(r => ({ employeeId: r.employeeId, awardType: r.awardType, name: r.name })));

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
}

module.exports = new SecureCareService();
