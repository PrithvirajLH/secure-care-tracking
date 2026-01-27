const { getPool, sql } = require('./helpers');
const { logAudit, AuditActions, getEmployeeInfoForAudit } = require('./auditProvider');

module.exports = {
  async approveConference(employeeId, userIdentifier = null, ipAddress = null) {
    const pool = await getPool();
    
    // Get employee info before update for audit
    const empInfo = await getEmployeeInfoForAudit(employeeId);
    
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
    
    // Log audit entry
    await logAudit({
      userIdentifier,
      action: AuditActions.CONFERENCE_APPROVED,
      recordId: employeeId,
      employeeNumber: empInfo?.employeeNumber,
      employeeName: empInfo?.name,
      awardType: empInfo?.awardType,
      fieldName: 'awaiting',
      oldValue: '1',
      newValue: '0',
      details: `Approved conference for ${empInfo?.name || 'employee'} (${empInfo?.awardType || 'unknown level'})`,
      ipAddress
    });
    
    return { success: true, message: 'Conference approved successfully' };
  }
  
  // Reject conference - set awaiting to NULL (rejected state)

  ,async rejectConference(employeeId, userIdentifier = null, ipAddress = null) {
    const pool = await getPool();
    
    // Get employee info before update for audit
    const empInfo = await getEmployeeInfoForAudit(employeeId);
    
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
    
    // Log audit entry
    await logAudit({
      userIdentifier,
      action: AuditActions.CONFERENCE_REJECTED,
      recordId: employeeId,
      employeeNumber: empInfo?.employeeNumber,
      employeeName: empInfo?.name,
      awardType: empInfo?.awardType,
      fieldName: 'awaiting',
      oldValue: '1',
      newValue: 'NULL',
      details: `Rejected conference for ${empInfo?.name || 'employee'} (${empInfo?.awardType || 'unknown level'})`,
      ipAddress
    });
    
    return { success: true, message: 'Conference rejected successfully' };
  }
  
  // Schedule training item - simplified without stored procedure

  ,async scheduleTraining(employeeId, columnName, date, userIdentifier = null, ipAddress = null) {
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
    
    // Get employee info and current value for audit
    const empInfo = await getEmployeeInfoForAudit(employeeId);
    const getOldValueRequest = pool.request();
    getOldValueRequest.input('employeeId', sql.Int, employeeId);
    const oldValueResult = await getOldValueRequest.query(`
      SELECT [${columnName}] as oldValue FROM dbo.SecureCareEmployee WHERE employeeId = @employeeId
    `);
    const oldValue = oldValueResult.recordset[0]?.oldValue;
    
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
    
    // Friendly field name mapping
    const fieldNameMap = {
      'scheduleStandingVideo': 'Standing Video',
      'scheduleSleepingVideo': 'Sleeping Video',
      'scheduleFeedGradVideo': 'Feed Grad Video',
      'schedulenoHandnoSpeak': 'No Hand No Speak',
      'scheduleSession#1': 'Session #1',
      'scheduleSession#2': 'Session #2',
      'scheduleSession#3': 'Session #3'
    };
    
    // Log audit entry
    await logAudit({
      userIdentifier,
      action: AuditActions.TRAINING_SCHEDULED,
      recordId: employeeId,
      employeeNumber: empInfo?.employeeNumber,
      employeeName: empInfo?.name,
      awardType: empInfo?.awardType,
      fieldName: columnName,
      oldValue: oldValue ? oldValue.toISOString().split('T')[0] : null,
      newValue: date,
      details: `Scheduled ${fieldNameMap[columnName] || columnName} for ${empInfo?.name || 'employee'} on ${date}`,
      ipAddress
    });
    
    return { success: true, message: 'Training scheduled successfully' };
  }
  
  // Edit completed date: update schedule column and clear actual column (set to NULL)
  // This allows editing a completed date by pushing it back to scheduled state

  ,async editCompletedDate(employeeId, scheduleColumn, completeColumn, date, userIdentifier = null, ipAddress = null) {
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
    
    // Get employee info and current values for audit
    const empInfo = await getEmployeeInfoForAudit(employeeId);
    const getOldValuesRequest = pool.request();
    getOldValuesRequest.input('employeeId', sql.Int, employeeId);
    const oldValuesResult = await getOldValuesRequest.query(`
      SELECT [${scheduleColumn}] as oldSchedule, [${completeColumn}] as oldComplete 
      FROM dbo.SecureCareEmployee WHERE employeeId = @employeeId
    `);
    const oldSchedule = oldValuesResult.recordset[0]?.oldSchedule;
    const oldComplete = oldValuesResult.recordset[0]?.oldComplete;
    
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
    
    // Friendly field name mapping
    const fieldNameMap = {
      'standingVideo': 'Standing Video',
      'sleepingVideo': 'Sleeping Video',
      'feedGradVideo': 'Feed Grad Video',
      'noHandnoSpeak': 'No Hand No Speak',
      'session#1': 'Session #1',
      'session#2': 'Session #2',
      'session#3': 'Session #3'
    };
    
    // Log audit entry
    await logAudit({
      userIdentifier,
      action: AuditActions.DATE_EDITED,
      recordId: employeeId,
      employeeNumber: empInfo?.employeeNumber,
      employeeName: empInfo?.name,
      awardType: empInfo?.awardType,
      fieldName: completeColumn,
      oldValue: oldComplete ? oldComplete.toISOString().split('T')[0] : null,
      newValue: `Rescheduled to ${date}`,
      details: `Edited ${fieldNameMap[completeColumn] || completeColumn} completed date for ${empInfo?.name || 'employee'} - moved back to scheduled for ${date}`,
      ipAddress
    });
    
    return { success: true, message: 'Date updated successfully' };
  }
  
  // Mark training as complete - simplified without stored procedure

  ,async completeTraining(employeeId, scheduleColumn, completeColumn, userIdentifier = null, ipAddress = null) {
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
    
    // Get employee info for audit
    const empInfo = await getEmployeeInfoForAudit(employeeId);
    
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
    
    // Friendly field name mapping
    const fieldNameMap = {
      'standingVideo': 'Standing Video',
      'sleepingVideo': 'Sleeping Video',
      'feedGradVideo': 'Feed Grad Video',
      'noHandnoSpeak': 'No Hand No Speak',
      'session#1': 'Session #1',
      'session#2': 'Session #2',
      'session#3': 'Session #3'
    };
    
    const completedDateStr = scheduledDate.toISOString().split('T')[0];
    
    // Log audit entry
    await logAudit({
      userIdentifier,
      action: AuditActions.TRAINING_COMPLETED,
      recordId: employeeId,
      employeeNumber: empInfo?.employeeNumber,
      employeeName: empInfo?.name,
      awardType: empInfo?.awardType,
      fieldName: completeColumn,
      oldValue: null,
      newValue: completedDateStr,
      details: `Marked ${fieldNameMap[completeColumn] || completeColumn} as complete for ${empInfo?.name || 'employee'} on ${completedDateStr}`,
      ipAddress
    });
    
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
  ,async addAdvisor(firstName, lastName, userIdentifier = null, ipAddress = null) {
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
    
    const newAdvisor = result.recordset[0];
    
    // Log audit entry
    await logAudit({
      userIdentifier,
      action: AuditActions.ADVISOR_ADDED,
      tableName: 'Advisor',
      recordId: newAdvisor.advisorId,
      fieldName: 'new_advisor',
      newValue: newAdvisor.fullName,
      details: `Added new advisor: ${newAdvisor.fullName}`,
      ipAddress
    });
    
    return newAdvisor;
  }
  
  // Update employee notes

  ,async updateEmployeeNotes(employeeId, notes, userIdentifier = null, ipAddress = null) {
    const pool = await getPool();
    
    // Get employee info and old notes for audit
    const empInfo = await getEmployeeInfoForAudit(employeeId);
    const getOldRequest = pool.request();
    getOldRequest.input('employeeId', sql.Int, employeeId);
    const oldResult = await getOldRequest.query(`
      SELECT notes FROM dbo.SecureCareEmployee WHERE employeeId = @employeeId
    `);
    const oldNotes = oldResult.recordset[0]?.notes;
    
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
    
    // Log audit entry
    await logAudit({
      userIdentifier,
      action: AuditActions.NOTES_UPDATED,
      recordId: employeeId,
      employeeNumber: empInfo?.employeeNumber,
      employeeName: empInfo?.name,
      awardType: empInfo?.awardType,
      fieldName: 'notes',
      oldValue: oldNotes,
      newValue: notes,
      details: `Updated notes for ${empInfo?.name || 'employee'}`,
      ipAddress
    });
    
    return { success: true, message: 'Notes updated successfully' };
  }

  // Update employee advisor

  ,async updateEmployeeAdvisor(employeeId, advisorId, userIdentifier = null, ipAddress = null) {
    const pool = await getPool();
    
    // Get employee info and old advisor for audit
    const empInfo = await getEmployeeInfoForAudit(employeeId);
    const getOldRequest = pool.request();
    getOldRequest.input('employeeId', sql.Int, employeeId);
    const oldResult = await getOldRequest.query(`
      SELECT e.advisorId, a.firstName + ' ' + ISNULL(a.lastName, '') as advisorName
      FROM dbo.SecureCareEmployee e
      LEFT JOIN dbo.Advisor a ON e.advisorId = a.advisorId
      WHERE e.employeeId = @employeeId
    `);
    const oldAdvisorId = oldResult.recordset[0]?.advisorId;
    const oldAdvisorName = oldResult.recordset[0]?.advisorName;
    
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
    
    // Get new advisor name for audit
    let newAdvisorName = null;
    if (advisorId) {
      const getNewRequest = pool.request();
      getNewRequest.input('advisorId', sql.Int, advisorId);
      const newAdvisorResult = await getNewRequest.query(`
        SELECT firstName + ' ' + ISNULL(lastName, '') as advisorName FROM dbo.Advisor WHERE advisorId = @advisorId
      `);
      newAdvisorName = newAdvisorResult.recordset[0]?.advisorName;
    }
    
    // Log audit entry
    await logAudit({
      userIdentifier,
      action: AuditActions.ADVISOR_CHANGED,
      recordId: employeeId,
      employeeNumber: empInfo?.employeeNumber,
      employeeName: empInfo?.name,
      awardType: empInfo?.awardType,
      fieldName: 'advisorId',
      oldValue: oldAdvisorName || (oldAdvisorId ? String(oldAdvisorId) : null),
      newValue: newAdvisorName || (advisorId ? String(advisorId) : 'None'),
      details: `Changed advisor for ${empInfo?.name || 'employee'} from ${oldAdvisorName || 'None'} to ${newAdvisorName || 'None'}`,
      ipAddress
    });
    
    return { success: true, message: 'Advisor updated successfully' };
  }

  // Update employee notes for specific level/awardType

  ,async updateEmployeeNotesForLevel(employeeId, awardType, notes, userIdentifier = null, ipAddress = null) {
    const pool = await getPool();
    
    // Get employee info and old notes for audit
    const empInfo = await getEmployeeInfoForAudit(employeeId);
    const getOldRequest = pool.request();
    getOldRequest.input('employeeId', sql.Int, employeeId);
    getOldRequest.input('awardType', sql.VarChar, awardType);
    const oldResult = await getOldRequest.query(`
      SELECT notes FROM dbo.SecureCareEmployee WHERE employeeId = @employeeId AND awardType = @awardType
    `);
    const oldNotes = oldResult.recordset[0]?.notes;
    
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
    
    // Log audit entry
    await logAudit({
      userIdentifier,
      action: AuditActions.NOTES_UPDATED,
      recordId: employeeId,
      employeeNumber: empInfo?.employeeNumber,
      employeeName: empInfo?.name,
      awardType: awardType,
      fieldName: 'notes',
      oldValue: oldNotes,
      newValue: notes,
      details: `Updated notes for ${empInfo?.name || 'employee'} (${awardType})`,
      ipAddress
    });
    
    return { success: true, message: `Notes updated successfully for ${awardType}` };
  }

  // Update employee advisor for specific level/awardType

  ,async updateEmployeeAdvisorForLevel(employeeId, awardType, advisorId, userIdentifier = null, ipAddress = null) {
    const pool = await getPool();
    
    // Get employee info and old advisor for audit
    const empInfo = await getEmployeeInfoForAudit(employeeId);
    const getOldRequest = pool.request();
    getOldRequest.input('employeeId', sql.Int, employeeId);
    getOldRequest.input('awardType', sql.VarChar, awardType);
    const oldResult = await getOldRequest.query(`
      SELECT e.advisorId, a.firstName + ' ' + ISNULL(a.lastName, '') as advisorName
      FROM dbo.SecureCareEmployee e
      LEFT JOIN dbo.Advisor a ON e.advisorId = a.advisorId
      WHERE e.employeeId = @employeeId AND e.awardType = @awardType
    `);
    const oldAdvisorId = oldResult.recordset[0]?.advisorId;
    const oldAdvisorName = oldResult.recordset[0]?.advisorName;
    
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
    
    // Get new advisor name for audit
    let newAdvisorName = null;
    if (advisorId) {
      const getNewRequest = pool.request();
      getNewRequest.input('advisorId', sql.Int, advisorId);
      const newAdvisorResult = await getNewRequest.query(`
        SELECT firstName + ' ' + ISNULL(lastName, '') as advisorName FROM dbo.Advisor WHERE advisorId = @advisorId
      `);
      newAdvisorName = newAdvisorResult.recordset[0]?.advisorName;
    }
    
    // Log audit entry
    await logAudit({
      userIdentifier,
      action: AuditActions.ADVISOR_CHANGED,
      recordId: employeeId,
      employeeNumber: empInfo?.employeeNumber,
      employeeName: empInfo?.name,
      awardType: awardType,
      fieldName: 'advisorId',
      oldValue: oldAdvisorName || (oldAdvisorId ? String(oldAdvisorId) : null),
      newValue: newAdvisorName || (advisorId ? String(advisorId) : 'None'),
      details: `Changed advisor for ${empInfo?.name || 'employee'} (${awardType}) from ${oldAdvisorName || 'None'} to ${newAdvisorName || 'None'}`,
      ipAddress
    });
    
    return { success: true, message: `Advisor updated successfully for ${awardType}` };
  }

  // Get employee by ID

};
