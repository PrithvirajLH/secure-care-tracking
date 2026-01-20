const { getPool, sql, normalizeSortOrder, normalizeSortBy, SORT_BY_READY_LIST } = require('./helpers');

module.exports = {
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
    const sortBy = normalizeSortBy(filters.sortBy, SORT_BY_READY_LIST, 'area');
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

  ,async getEmployeesReadyForLevel3Award(filters = {}) {
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
    const sortBy = normalizeSortBy(filters.sortBy, SORT_BY_READY_LIST, 'area');
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

  ,async getEmployeesReadyForConsultantAward(filters = {}) {
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
    const sortBy = normalizeSortBy(filters.sortBy, SORT_BY_READY_LIST, 'area');
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
      const total = countResult.recordset[0].total;
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

  ,async getEmployeesReadyForCoachAward(filters = {}) {
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
      FROM [dbo].[SecureCareEmployee] consultant
      JOIN [dbo].[SecureCareEmployee] coach
        ON coach.employeeNumber = consultant.employeeNumber
      INNER JOIN [dbo].[SecureCareEmployee] l1
        ON l1.employeeNumber = consultant.employeeNumber AND l1.awardType = 'Level 1'
      INNER JOIN [dbo].[SecureCareEmployee] l2
        ON l2.employeeNumber = consultant.employeeNumber AND l2.awardType = 'Level 2'
      LEFT JOIN [dbo].[SecureCareEmployee] l3
        ON l3.employeeNumber = consultant.employeeNumber AND l3.awardType = 'Level 3'
      LEFT JOIN dbo.Advisor a2 ON l2.advisorId = a2.advisorId
      LEFT JOIN dbo.Advisor a3 ON l3.advisorId = a3.advisorId
      LEFT JOIN dbo.Advisor aConsultant ON consultant.advisorId = aConsultant.advisorId
      LEFT JOIN dbo.Advisor aCoach ON coach.advisorId = aCoach.advisorId
      WHERE consultant.awardType = 'Consultant'
        AND (consultant.secureCareAwarded = 1 OR consultant.secureCareAwardedDate IS NOT NULL)
        AND l1.secureCareAwarded = 1
        AND l2.secureCareAwarded = 1
        -- AND l3.secureCareAwarded = 1  -- Level 3 awarded is optional for Coach
        AND coach.awardType = 'Coach'
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
    const sortBy = normalizeSortBy(filters.sortBy, SORT_BY_READY_LIST, 'area');
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
      console.error('Error in getEmployeesReadyForCoachAward query:', error);
      console.error('Query:', query);
      throw error;
    }
    
    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT consultant.employeeNumber) as total
      FROM [dbo].[SecureCareEmployee] consultant
      JOIN [dbo].[SecureCareEmployee] coach
        ON coach.employeeNumber = consultant.employeeNumber
      INNER JOIN [dbo].[SecureCareEmployee] l1
        ON l1.employeeNumber = consultant.employeeNumber AND l1.awardType = 'Level 1'
      INNER JOIN [dbo].[SecureCareEmployee] l2
        ON l2.employeeNumber = consultant.employeeNumber AND l2.awardType = 'Level 2'
      LEFT JOIN [dbo].[SecureCareEmployee] l3
        ON l3.employeeNumber = consultant.employeeNumber AND l3.awardType = 'Level 3'
      WHERE consultant.awardType = 'Consultant'
        AND (consultant.secureCareAwarded = 1 OR consultant.secureCareAwardedDate IS NOT NULL)
        AND l1.secureCareAwarded = 1
        AND l2.secureCareAwarded = 1
        -- AND l3.secureCareAwarded = 1  -- Level 3 awarded is optional for Coach
        AND coach.awardType = 'Coach'
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
      const total = countResult.recordset[0].total;
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
};
