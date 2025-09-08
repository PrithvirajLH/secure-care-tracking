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
}

module.exports = new SecureCareService();
