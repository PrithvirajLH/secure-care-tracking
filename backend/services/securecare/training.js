const { getPool, sql } = require('./helpers');

module.exports = {
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

  ,async rejectConference(employeeId) {
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

  ,async scheduleTraining(employeeId, columnName, date) {
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

  ,async editCompletedDate(employeeId, scheduleColumn, completeColumn, date) {
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

  ,async completeTraining(employeeId, scheduleColumn, completeColumn) {
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
  ,async getAdvisors() {
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
  ,async addAdvisor(firstName, lastName) {
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

  ,async updateEmployeeNotes(employeeId, notes) {
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

  ,async updateEmployeeAdvisor(employeeId, advisorId) {
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

  ,async updateEmployeeNotesForLevel(employeeId, awardType, notes) {
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

  ,async updateEmployeeAdvisorForLevel(employeeId, awardType, advisorId) {
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

};
