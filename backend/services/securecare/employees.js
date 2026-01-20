const { getPool, sql, normalizeSortOrder, normalizeSortBy, resolveDateFields, SORT_BY_EMPLOYEES } = require('./helpers');

module.exports = {
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
        const date = filters.date; // YYYY-MM-DD
        const dateFields = resolveDateFields(filters.dateField);
        if (dateFields) {
          const { column, scheduleColumn } = dateFields;
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
    const sortBy = normalizeSortBy(filters.sortBy, SORT_BY_EMPLOYEES, 'name');
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
        const date = filters.date; // YYYY-MM-DD
        const dateFields = resolveDateFields(filters.dateField);
        if (dateFields) {
          const { column, scheduleColumn } = dateFields;
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

  ,async getEmployeeById(employeeId) {
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

  ,async getUniqueEmployeesByLevel(level, filters = {}) {
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
      const sortBy = normalizeSortBy(filters.sortBy, SORT_BY_EMPLOYEES, 'name');
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
    const sortBy = normalizeSortBy(filters.sortBy, SORT_BY_EMPLOYEES, 'name');
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

  ,async getEmployeeLevelsByEmployeeId(employeeId) {
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

};
