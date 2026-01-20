const { getPool } = require('./helpers');

module.exports = {
  async getDashboardSummary() {
    const pool = await getPool();
    const request = pool.request();
    const result = await request.query(`
      SELECT
        e.employeeId,
        e.employeeNumber,
        e.name,
        e.facility,
        e.awardType,
        e.assignedDate,
        e.completedDate,
        e.conferenceCompleted,
        e.scheduleStandingVideo,
        e.scheduleSleepingVideo,
        e.scheduleFeedGradVideo,
        e.schedulenoHandnoSpeak,
        e.[scheduleSession#1] AS scheduleSession1,
        e.[scheduleSession#2] AS scheduleSession2,
        e.[scheduleSession#3] AS scheduleSession3,
        e.standingVideo,
        e.sleepingVideo,
        e.feedGradVideo,
        e.noHandnoSpeak,
        e.[session#1] AS session1,
        e.[session#2] AS session2,
        e.[session#3] AS session3,
        e.secureCareAwarded,
        e.secureCareAwardedDate,
        e.awaiting
      FROM dbo.SecureCareEmployee e
    `);

    const employees = result.recordset || [];

    const checkAwarded = (e) => e.secureCareAwarded === true || e.secureCareAwarded === 1 || e.secureCareAwarded === '1';
    const parseDate = (dateValue) => {
      if (!dateValue) return null;
      if (typeof dateValue === 'string') {
        if (dateValue.includes('T')) {
          const datePart = dateValue.split('T')[0];
          if (datePart.match(/^\\d{4}-\\d{2}-\\d{2}$/)) {
            const [year, month, day] = datePart.split('-').map(Number);
            return new Date(year, month - 1, day);
          }
          return new Date(dateValue);
        }
        if (dateValue.match(/^\\d{4}-\\d{2}-\\d{2}$/)) {
          const [year, month, day] = dateValue.split('-').map(Number);
          return new Date(year, month - 1, day);
        }
        return new Date(dateValue);
      }
      return dateValue;
    };
    const getTime = (e) => {
      const dates = [
        e.secureCareAwardedDate,
        e.conferenceCompleted,
        e.completedDate,
        e.session3,
        e.session2,
        e.session1,
        e.standingVideo,
        e.sleepingVideo,
        e.feedGradVideo,
        e.noHandnoSpeak,
        e.assignedDate
      ].map((d) => (d ? new Date(d).getTime() : 0));
      return Math.max(0, ...dates);
    };

    const perLevelEmployees = (() => {
      const map = new Map();
      for (const employee of employees) {
        const empNum = String(employee.employeeNumber || employee.employeeId);
        const level = employee.awardType || 'Unknown';
        const awaitingStatus = employee.awaiting === null
          ? 'rejected'
          : (employee.awaiting === 0 || employee.awaiting === false)
            ? 'approved'
            : (employee.awaiting === 1 || employee.awaiting === true)
              ? 'awaiting'
              : 'unknown';
        const key = `${empNum}::${level}::${awaitingStatus}`;
        const existing = map.get(key);
        if (!existing) {
          map.set(key, employee);
          continue;
        }
        const currentTime = getTime(employee);
        const previousTime = getTime(existing);
        if (currentTime > previousTime) {
          map.set(key, employee);
        }
      }
      return Array.from(map.values());
    })();

    const uniqueEmployeeNumbers = new Set(employees.map((e) => e.employeeNumber));
    const total = uniqueEmployeeNumbers.size;

    const level1Completed = perLevelEmployees.filter((e) => e.awardType === 'Level 1' && checkAwarded(e)).length;
    const level2Completed = perLevelEmployees.filter((e) => e.awardType === 'Level 2' && checkAwarded(e)).length;
    const level3Completed = perLevelEmployees.filter((e) => e.awardType === 'Level 3' && checkAwarded(e)).length;
    const consultantCompleted = perLevelEmployees.filter((e) => e.awardType === 'Consultant' && checkAwarded(e)).length;
    const coachCompleted = perLevelEmployees.filter((e) => e.awardType === 'Coach' && checkAwarded(e)).length;

    const level1InProgress = perLevelEmployees.filter((e) =>
      e.awardType === 'Level 1' && !checkAwarded(e) && !!e.assignedDate
    ).length;
    const level2InProgress = perLevelEmployees.filter((e) =>
      e.awardType === 'Level 2' && !checkAwarded(e) &&
      e.conferenceCompleted && String(e.conferenceCompleted).trim() !== '' &&
      (e.awaiting === 0 || e.awaiting === false)
    ).length;
    const level3InProgress = perLevelEmployees.filter((e) =>
      e.awardType === 'Level 3' && !checkAwarded(e) &&
      e.conferenceCompleted && String(e.conferenceCompleted).trim() !== '' &&
      (e.awaiting === 0 || e.awaiting === false)
    ).length;
    const consultantInProgress = perLevelEmployees.filter((e) =>
      e.awardType === 'Consultant' && !checkAwarded(e) &&
      e.conferenceCompleted && String(e.conferenceCompleted).trim() !== '' &&
      (e.awaiting === 0 || e.awaiting === false)
    ).length;
    const coachInProgress = perLevelEmployees.filter((e) =>
      e.awardType === 'Coach' && !checkAwarded(e) &&
      e.conferenceCompleted && String(e.conferenceCompleted).trim() !== '' &&
      (e.awaiting === 0 || e.awaiting === false)
    ).length;

    const level2Ids = new Set(employees.filter((e) => e.awardType === 'Level 2').map((e) => e.employeeId));
    const level3Ids = new Set(employees.filter((e) => e.awardType === 'Level 3').map((e) => e.employeeId));
    const consultantIds = new Set(employees.filter((e) => e.awardType === 'Consultant').map((e) => e.employeeId));
    const coachIds = new Set(employees.filter((e) => e.awardType === 'Coach').map((e) => e.employeeId));

    const level1Pending = employees.filter((e) =>
      !e.awardType || (e.awardType === 'Level 1' && !e.assignedDate)
    ).length;
    const level2Pending = employees.filter((e) =>
      e.awardType === 'Level 1' && checkAwarded(e) && !level2Ids.has(e.employeeId)
    ).length;
    const level3Pending = employees.filter((e) =>
      e.awardType === 'Level 2' && checkAwarded(e) && !level3Ids.has(e.employeeId)
    ).length;
    const consultantPending = employees.filter((e) =>
      e.awardType === 'Level 3' && checkAwarded(e) && !consultantIds.has(e.employeeId)
    ).length;
    const coachPending = employees.filter((e) =>
      e.awardType === 'Consultant' && checkAwarded(e) && !coachIds.has(e.employeeId)
    ).length;

    const level1Overdue = employees.filter((e) => {
      if (e.awardType !== 'Level 1' || !e.assignedDate || checkAwarded(e)) return false;
      const assignedDate = parseDate(e.assignedDate);
      if (!assignedDate) return false;
      const overdueDate = new Date(assignedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      return overdueDate < new Date();
    }).length;
    const level2Overdue = employees.filter((e) => {
      if (e.awardType !== 'Level 2' || !e.assignedDate || checkAwarded(e)) return false;
      const assignedDate = parseDate(e.assignedDate);
      if (!assignedDate) return false;
      const overdueDate = new Date(assignedDate.getTime() + 45 * 24 * 60 * 60 * 1000);
      return overdueDate < new Date();
    }).length;
    const level3Overdue = employees.filter((e) => {
      if (e.awardType !== 'Level 3' || !e.assignedDate || checkAwarded(e)) return false;
      const assignedDate = parseDate(e.assignedDate);
      if (!assignedDate) return false;
      const overdueDate = new Date(assignedDate.getTime() + 60 * 24 * 60 * 60 * 1000);
      return overdueDate < new Date();
    }).length;

    const awaitingApprovals = employees.filter((e) => {
      if (e.awardType === 'Level 1') return false;
      return e.awaiting === 1 || e.awaiting === true;
    }).length;
    const rejectedApprovals = employees.filter((e) =>
      e.conferenceCompleted && String(e.conferenceCompleted).trim() !== '' && e.awaiting === null
    ).length;

    const level1Total = perLevelEmployees.filter((e) => e.awardType === 'Level 1').length;
    const level2Total = perLevelEmployees.filter((e) => e.awardType === 'Level 2').length;
    const level3Total = perLevelEmployees.filter((e) => e.awardType === 'Level 3').length;
    const consultantTotal = perLevelEmployees.filter((e) => e.awardType === 'Consultant').length;
    const coachTotal = perLevelEmployees.filter((e) => e.awardType === 'Coach').length;

    const level1Percentage = Math.round((level1Completed / Math.max(level1Total, 1)) * 100);
    const level2Percentage = Math.round((level2Completed / Math.max(level2Total, 1)) * 100);
    const level3Percentage = Math.round((level3Completed / Math.max(level3Total, 1)) * 100);
    const consultantPercentage = Math.round((consultantCompleted / Math.max(consultantTotal, 1)) * 100);
    const coachPercentage = Math.round((coachCompleted / Math.max(coachTotal, 1)) * 100);

    const totalCompleted = level1Completed + level2Completed + level3Completed + consultantCompleted + coachCompleted;
    const totalInProgress = level1InProgress + level2InProgress + level3InProgress + consultantInProgress + coachInProgress;

    const stats = {
      total,
      totalCompleted,
      totalInProgress,
      totalPending: level1Pending + level2Pending + level3Pending + consultantPending + coachPending,
      totalOverdue: level1Overdue + level2Overdue + level3Overdue,
      awaitingApprovals,
      rejectedApprovals,
      completion: {
        level1: level1Percentage,
        level2: level2Percentage,
        level3: level3Percentage,
        consultant: consultantPercentage,
        coach: coachPercentage
      },
      counts: {
        level1: { completed: level1Completed, inProgress: level1InProgress, pending: level1Pending, overdue: level1Overdue },
        level2: { completed: level2Completed, inProgress: level2InProgress, pending: level2Pending, overdue: level2Overdue },
        level3: { completed: level3Completed, inProgress: level3InProgress, pending: level3Pending, overdue: level3Overdue },
        consultant: { completed: consultantCompleted, inProgress: consultantInProgress, pending: consultantPending, overdue: 0 },
        coach: { completed: coachCompleted, inProgress: coachInProgress, pending: coachPending, overdue: 0 }
      }
    };

    const validEmployees = employees.filter((employee) => {
      const facilityName = employee.facility || employee.Facility;
      return facilityName &&
        facilityName.trim() !== '' &&
        facilityName !== 'null' &&
        facilityName !== 'undefined';
    });

    let facilityRankings = { top: [], bottom: [] };
    if (validEmployees.length > 0) {
      const facilityStats = validEmployees.reduce((acc, employee) => {
        const facilityName = (employee.facility || employee.Facility)
          .trim()
          .toLowerCase()
          .replace(/\\s+/g, ' ');

        if (!acc[facilityName]) {
          acc[facilityName] = { total: 0, completed: 0, inProgress: 0, awaiting: 0 };
        }
        acc[facilityName].total++;
        const isEmployeeAwarded = checkAwarded(employee);
        if (isEmployeeAwarded) {
          acc[facilityName].completed++;
        } else if (employee.awaiting === 1 || employee.awaiting === true) {
          acc[facilityName].awaiting++;
        } else {
          acc[facilityName].inProgress++;
        }
        return acc;
      }, {});

      const WEIGHT_COMPLETED = 0.8;
      const WEIGHT_INPROGRESS = 0.2;
      const maxInProgressCount = Math.max(
        ...Object.values(facilityStats).map((stats) => stats.inProgress),
        1
      );

      const facilityDataArray = Object.entries(facilityStats)
        .map(([normalizedName, stats]) => {
          const completedDenom = Math.max(stats.completed + stats.inProgress, 1);
          const completedRatio = (stats.completed / completedDenom) * 100;
          const inProgressRatio = (stats.inProgress / completedDenom) * 100;
          const inProgressScore = maxInProgressCount > 0 ? (stats.inProgress / maxInProgressCount) * 100 : 0;
          const combinedScore = WEIGHT_COMPLETED * completedRatio + WEIGHT_INPROGRESS * inProgressScore;

          const displayName = normalizedName
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          return {
            name: displayName.length > 25 ? `${displayName.substring(0, 25)}...` : displayName,
            fullName: displayName,
            completedRatio: Math.round(completedRatio),
            inProgressRatio: Math.round(inProgressRatio),
            inProgressScore: Math.round(inProgressScore),
            combinedScore,
            completedCount: stats.completed,
            inProgressCount: stats.inProgress,
            awaitingCount: stats.awaiting,
            totalCount: stats.total
          };
        })
        .sort((a, b) => b.combinedScore - a.combinedScore);

      facilityRankings = {
        top: facilityDataArray.slice(0, 5),
        bottom: facilityDataArray.slice(-5).reverse()
      };
    }

    const trainingFields = [
      { scheduleField: 'scheduleStandingVideo', completedField: 'standingVideo', name: 'Standing Video' },
      { scheduleField: 'scheduleSleepingVideo', completedField: 'sleepingVideo', name: 'Sleeping Video' },
      { scheduleField: 'scheduleFeedGradVideo', completedField: 'feedGradVideo', name: 'Feed/Grad Video' },
      { scheduleField: 'schedulenoHandnoSpeak', completedField: 'noHandnoSpeak', name: 'No Hand No Speak' },
      { scheduleField: 'scheduleSession1', completedField: 'session1', name: 'Session 1' },
      { scheduleField: 'scheduleSession2', completedField: 'session2', name: 'Session 2' },
      { scheduleField: 'scheduleSession3', completedField: 'session3', name: 'Session 3' }
    ];

    const activities = [];
    for (const employee of employees) {
      const level = employee.awardType || 'Level 1';
      const employeeKey = employee.employeeNumber || employee.employeeId;
      const employeeName = employee.name || 'Unknown';

      if (employee.assignedDate) {
        activities.push({
          id: `${employeeKey}-${level}-assigned-${employee.assignedDate}`,
          type: 'scheduled',
          employeeName,
          level,
          date: employee.assignedDate,
          description: `Assigned to ${level}`
        });
      }

      if (employee.completedDate) {
        activities.push({
          id: `${employeeKey}-${level}-relias-completed-${employee.completedDate}`,
          type: 'completed',
          employeeName,
          level,
          date: employee.completedDate,
          description: `Completed Relias training for ${level}`
        });
      }

      if (employee.conferenceCompleted) {
        if (employee.awaiting === 1 || employee.awaiting === true) {
          activities.push({
            id: `${employeeKey}-${level}-conference-awaiting-${employee.conferenceCompleted}`,
            type: 'awaiting',
            employeeName,
            level,
            date: employee.conferenceCompleted,
            description: `Conference completed, awaiting approval for ${level}`
          });
        } else if (employee.awaiting === 0 || employee.awaiting === false) {
          activities.push({
            id: `${employeeKey}-${level}-conference-approved-${employee.conferenceCompleted}`,
            type: 'conference',
            employeeName,
            level,
            date: employee.conferenceCompleted,
            description: `Conference approved for ${level}`
          });
        }
      }

      trainingFields.forEach(({ scheduleField, completedField, name }) => {
        if (employee[scheduleField] && !employee[completedField]) {
          activities.push({
            id: `${employeeKey}-${level}-${scheduleField}-${employee[scheduleField]}`,
            type: 'scheduled',
            employeeName,
            level,
            date: employee[scheduleField],
            description: `Scheduled for ${name} in ${level}`
          });
        }
        if (employee[completedField]) {
          activities.push({
            id: `${employeeKey}-${level}-${completedField}-${employee[completedField]}`,
            type: 'completed',
            employeeName,
            level,
            date: employee[completedField],
            description: `Completed ${name} in ${level}`
          });
        }
      });

      const awardedDate = employee.secureCareAwardedDate || employee.completedDate || employee.conferenceCompleted || employee.assignedDate;
      if (checkAwarded(employee) && awardedDate) {
        activities.push({
          id: `${employeeKey}-${level}-awarded-${awardedDate}`,
          type: 'awarded',
          employeeName,
          level,
          date: awardedDate,
          description: `Awarded ${level}`
        });
      }
    }

    const sortedActivities = activities
      .filter((activity) => activity.date)
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (isNaN(dateA) && isNaN(dateB)) return 0;
        if (isNaN(dateA)) return 1;
        if (isNaN(dateB)) return -1;
        return dateB - dateA;
      });

    const activityCounts = sortedActivities.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {});

    const groupedActivities = {};
    sortedActivities.forEach((activity) => {
      if (!groupedActivities[activity.type]) {
        groupedActivities[activity.type] = [];
      }
      if (groupedActivities[activity.type].length < 5) {
        groupedActivities[activity.type].push(activity);
      }
    });

    const recentActivity = Object.values(groupedActivities).flat();

    return {
      stats,
      facilityRankings,
      recentActivity,
      activityCounts
    };
  }
};
