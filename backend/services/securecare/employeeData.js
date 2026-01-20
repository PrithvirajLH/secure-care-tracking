const { getPool, sql, normalizeSortOrder, normalizeSortBy, SORT_BY_EMPLOYEE_DATA } = require('./helpers');

module.exports = {
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

    const sortBy = normalizeSortBy(filters.sortBy, SORT_BY_EMPLOYEE_DATA, 'area');
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
};
