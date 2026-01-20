const { getPool, sql } = require('./helpers');

module.exports = {
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


  ,async getFacilityPerformance(filters = {}) {
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


  ,async getAreaPerformance(filters = {}) {
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


  ,async getMonthlyTrends(filters = {}) {
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


  ,async getCertificationProgress(filters = {}) {
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


  ,async getRecentActivity(filters = {}) {
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


  ,async getAnalyticsMetrics(filters = {}) {
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

  ,async getCompletionsAggregates(filters = {}) {
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

};
