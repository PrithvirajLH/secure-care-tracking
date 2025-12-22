import { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, FileText, UsersRound, Clock, CheckCircle, AlertCircle, TrendingUp, Home, Calendar } from "lucide-react";
import { Pie, PieChart, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LabelList } from "recharts";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { parseDate } from "@/config/awardTypes";
import PageHeader from "@/components/PageHeader";
import { trainingAPI } from "@/services/api";

// Refreshed palette for certification progress pie
const COLORS = ["#4f46e5", "#14b8a6", "#f59e0b", "#ec4899", "#22c55e"];

// Helper function to get display names for requirement keys
const getRequirementDisplayName = (requirementKey: string): string => {
  const requirementMap: Record<string, string> = {
    'level1ReliasAssigned': 'Level 1 Relias',
    'level1ReliasCompleted': 'Level 1 Relias',
    'level1ConferenceCompleted': 'Level 1 Conference',
    'level1Awarded': 'Level 1 Award',
    'level2ReliasAssigned': 'Level 2 Relias',
    'level2ReliasCompleted': 'Level 2 Relias',
    'level2ConferenceCompleted': 'Level 2 Conference',
    'level2Awarded': 'Level 2 Award',
    'level3ReliasAssigned': 'Level 3 Relias',
    'level3ReliasCompleted': 'Level 3 Relias',
    'level3ConferenceCompleted': 'Level 3 Conference',
    'level3Awarded': 'Level 3 Award',
    'consultantReliasAssigned': 'Consultant Relias',
    'consultantReliasCompleted': 'Consultant Relias',
    'consultantConferenceCompleted': 'Consultant Conference',
    'consultantAwarded': 'Consultant Award',
    'coachReliasAssigned': 'Coach Relias',
    'coachReliasCompleted': 'Coach Relias',
    'coachConferenceCompleted': 'Coach Conference',
    'coachAwarded': 'Coach Award'
  };
  
  return requirementMap[requirementKey] || requirementKey;
};

// Helper function to fix date display (adds 1 day to compensate for timezone issues)
const formatActivityDate = (dateString: string): string => {
  const date = new Date(dateString);
  // Add 1 day to compensate for timezone conversion issues
  const adjustedDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  return adjustedDate.toLocaleDateString();
};

export default function Dashboard() {
  const { state } = useApp();

  // State for fetching ALL employee records across all pages
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });

  // Function to fetch all pages of employee data
  const fetchAllEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setAllEmployees([]);
    
    try {
      // First, fetch page 1 to get total pages
      const firstPageResult = await trainingAPI.getEmployeesByLevel('all', {
        page: 1,
        limit: 500 // Use 500 per page for efficiency
      });
      
      const totalPages = firstPageResult.pagination.totalPages;
      setLoadingProgress({ current: 1, total: totalPages });
      
      // Start with first page results
      let accumulated = [...firstPageResult.employees];
      
      // Fetch remaining pages if there are more
      if (totalPages > 1) {
        const pagePromises: Promise<any>[] = [];
        
        // Fetch pages 2 through totalPages in parallel batches
        for (let page = 2; page <= totalPages; page++) {
          pagePromises.push(
            trainingAPI.getEmployeesByLevel('all', {
              page,
              limit: 500
            })
          );
        }
        
        // Process in batches of 5 to avoid overwhelming the server
        const batchSize = 5;
        for (let i = 0; i < pagePromises.length; i += batchSize) {
          const batch = pagePromises.slice(i, i + batchSize);
          const batchResults = await Promise.all(batch);
          
          batchResults.forEach(result => {
            accumulated = [...accumulated, ...result.employees];
          });
          
          setLoadingProgress({ current: Math.min(i + batchSize + 1, totalPages), total: totalPages });
        }
      }
      
      setAllEmployees(accumulated);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch employees'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchAllEmployees();
  }, [fetchAllEmployees]);

  useEffect(() => {
    document.title = "SecureCare Training Dashboard";
  }, []);

  // Auto-refresh when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchAllEmployees();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchAllEmployees]);

  // Also refresh on window focus to capture rapid changes (e.g., awarded toggled)
  useEffect(() => {
    const handleFocus = () => {
      fetchAllEmployees();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchAllEmployees]);

  // Use accumulated employees from all pages
  const employees = useMemo(() => {
    if (allEmployees && allEmployees.length > 0) {
      return allEmployees;
    } else if (state.employees && state.employees.length > 0) {
      return state.employees;
    } else {
      return [];
    }
  }, [allEmployees, state.employees]);

  const stats = useMemo(() => {
    // Get unique employees count (one record per employeeNumber)
    const uniqueEmployeeNumbers = new Set(employees.map(e => e.employeeNumber));
    const total = uniqueEmployeeNumbers.size;
    
    // Helper function to check if secureCareAwarded is truthy (handles boolean, number, string)
    const checkAwarded = (e: any) => {
      return e.secureCareAwarded === true || e.secureCareAwarded === 1 || e.secureCareAwarded === '1';
    };

    // Get unique employees prioritized by current, highest-status record per employeeNumber
    const uniqueEmployees = (() => {
      const employeeMap = new Map<string, any>();
      const getRank = (e: any) => {
        // Prefer awarded > approved conference > in progress > assigned
        if (checkAwarded(e)) return 4;
        const hasApprovedConf = e.conferenceCompleted && String(e.conferenceCompleted).trim() !== '' && (e.awaiting === 0 || e.awaiting === false);
        if (hasApprovedConf) return 3;
        const hasInProgress = e.conferenceCompleted && String(e.conferenceCompleted).trim() !== '' && (e.awaiting !== 1 && e.awaiting !== true);
        if (hasInProgress) return 2;
        if (e.assignedDate) return 1;
        return 0;
      };
      const getTime = (e: any) => {
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
        ].map((d: any) => d ? new Date(d).getTime() : 0);
        return Math.max(0, ...dates);
      };
      for (const e of employees) {
        const key = String(e.employeeNumber || e.employeeId);
        const existing = employeeMap.get(key);
        if (!existing) { employeeMap.set(key, e); continue; }
        const aRank = getRank(e), bRank = getRank(existing);
        if (aRank > bRank) { employeeMap.set(key, e); continue; }
        if (aRank === bRank) {
          const aTime = getTime(e), bTime = getTime(existing);
          if (aTime > bTime) employeeMap.set(key, e);
        }
      }
      return Array.from(employeeMap.values());
    })();
    
    // Build per-level, per-employeeNumber deduplicated records
    // Use same logic as training page to show both approved and rejected records
    const perLevelEmployees = (() => {
      const map = new Map<string, any>();
      const getTime = (e: any) => {
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
        ].map((d: any) => (d ? new Date(d).getTime() : 0));
        return Math.max(0, ...dates);
      };
      for (const e of employees) {
        const empNum = String(e.employeeNumber || e.employeeId);
        const level = e.awardType || 'Unknown';
        
        // Create unique key that includes awaiting status to show both approved and rejected records
        const awaitingStatus = e.awaiting === null ? 'rejected' : 
                             e.awaiting === 0 ? 'approved' : 
                             e.awaiting === 1 ? 'awaiting' : 'unknown';
        const key = `${empNum}::${level}::${awaitingStatus}`;
        
        const existing = map.get(key);
        if (!existing) { map.set(key, e); continue; }
        const aTime = getTime(e), bTime = getTime(existing);
        if (aTime > bTime) map.set(key, e);
      }
      return Array.from(map.values());
    })();

    // Calculate completion rates for each level using per-level deduped records
    const level1Completed = perLevelEmployees.filter(e => e.awardType === 'Level 1' && checkAwarded(e)).length;
    const level2Completed = perLevelEmployees.filter(e => e.awardType === 'Level 2' && checkAwarded(e)).length;
    const level3Completed = perLevelEmployees.filter(e => e.awardType === 'Level 3' && checkAwarded(e)).length;
    const consultantCompleted = perLevelEmployees.filter(e => e.awardType === 'Consultant' && checkAwarded(e)).length;
    const coachCompleted = perLevelEmployees.filter(e => e.awardType === 'Coach' && checkAwarded(e)).length;

    // In-progress counts per level
    // Level 1: Has assignedDate but not awarded
    const level1InProgress = perLevelEmployees.filter(e => 
      e.awardType === 'Level 1' && !checkAwarded(e) && !!e.assignedDate
    ).length;
    // Level 2+: Has conference completed, approved (awaiting=0), but not awarded
    const level2InProgress = perLevelEmployees.filter(e => 
      e.awardType === 'Level 2' && !checkAwarded(e) && 
      e.conferenceCompleted && String(e.conferenceCompleted).trim() !== '' && 
      (e.awaiting === 0 || e.awaiting === false)
    ).length;
    const level3InProgress = perLevelEmployees.filter(e => 
      e.awardType === 'Level 3' && !checkAwarded(e) && 
      e.conferenceCompleted && String(e.conferenceCompleted).trim() !== '' && 
      (e.awaiting === 0 || e.awaiting === false)
    ).length;
    const consultantInProgress = perLevelEmployees.filter(e => 
      e.awardType === 'Consultant' && !checkAwarded(e) && 
      e.conferenceCompleted && String(e.conferenceCompleted).trim() !== '' && 
      (e.awaiting === 0 || e.awaiting === false)
    ).length;
    const coachInProgress = perLevelEmployees.filter(e => 
      e.awardType === 'Coach' && !checkAwarded(e) && 
      e.conferenceCompleted && String(e.conferenceCompleted).trim() !== '' && 
      (e.awaiting === 0 || e.awaiting === false)
    ).length;

    // Calculate pending counts (no award type assigned yet)
    const level1Pending = employees.filter(e => !e.awardType || e.awardType === 'Level 1' && !e.assignedDate).length;
    const level2Pending = employees.filter(e => e.awardType === 'Level 1' && checkAwarded(e) && !employees.some(emp => emp.employeeId === e.employeeId && emp.awardType === 'Level 2')).length;
    const level3Pending = employees.filter(e => e.awardType === 'Level 2' && checkAwarded(e) && !employees.some(emp => emp.employeeId === e.employeeId && emp.awardType === 'Level 3')).length;
    const consultantPending = employees.filter(e => e.awardType === 'Level 3' && checkAwarded(e) && !employees.some(emp => emp.employeeId === e.employeeId && emp.awardType === 'Consultant')).length;
    const coachPending = employees.filter(e => e.awardType === 'Consultant' && checkAwarded(e) && !employees.some(emp => emp.employeeId === e.employeeId && emp.awardType === 'Coach')).length;

    // Calculate overdue (assigned but not completed within expected timeframe)
    const level1Overdue = employees.filter(e => {
      if (e.awardType !== 'Level 1' || !e.assignedDate || checkAwarded(e)) return false;
      const assignedDate = parseDate(e.assignedDate);
      if (!assignedDate) return false;
      const overdueDate = new Date(assignedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      return overdueDate < new Date();
    }).length;
    const level2Overdue = employees.filter(e => {
      if (e.awardType !== 'Level 2' || !e.assignedDate || checkAwarded(e)) return false;
      const assignedDate = parseDate(e.assignedDate);
      if (!assignedDate) return false;
      const overdueDate = new Date(assignedDate.getTime() + 45 * 24 * 60 * 60 * 1000);
      return overdueDate < new Date();
    }).length;
    const level3Overdue = employees.filter(e => {
      if (e.awardType !== 'Level 3' || !e.assignedDate || checkAwarded(e)) return false;
      const assignedDate = parseDate(e.assignedDate);
      if (!assignedDate) return false;
      const overdueDate = new Date(assignedDate.getTime() + 60 * 24 * 60 * 60 * 1000);
      return overdueDate < new Date();
    }).length;

    // Awaiting approvals (L2+ conference completed but awaiting approval)
    // Match Completions page logic: count all records with awaiting = 1 (not just unique employees)
    const awaitingApprovals = employees.filter(e => {
      if (e.awardType === 'Level 1') return false;
      return e.awaiting === 1 || e.awaiting === true; // 1 or true => awaiting approval
    }).length;

    // Rejected approvals (conference completed but awaiting=null, indicating rejection)
    // Use all employees, not just unique ones, to match completion page logic
    const rejectedEmployees = employees.filter(e => {
      return e.conferenceCompleted && e.conferenceCompleted.trim() !== '' && e.awaiting === null;
    });
    const rejectedApprovals = rejectedEmployees.length;
    

    // Calculate completion percentages as percentage of total employees assigned to each level
    const level1Total = perLevelEmployees.filter(e => e.awardType === 'Level 1').length;
    const level2Total = perLevelEmployees.filter(e => e.awardType === 'Level 2').length;
    const level3Total = perLevelEmployees.filter(e => e.awardType === 'Level 3').length;
    const consultantTotal = perLevelEmployees.filter(e => e.awardType === 'Consultant').length;
    const coachTotal = perLevelEmployees.filter(e => e.awardType === 'Coach').length;
    
    const level1Percentage = Math.round((level1Completed / Math.max(level1Total, 1)) * 100);
    const level2Percentage = Math.round((level2Completed / Math.max(level2Total, 1)) * 100);
    const level3Percentage = Math.round((level3Completed / Math.max(level3Total, 1)) * 100);
    const consultantPercentage = Math.round((consultantCompleted / Math.max(consultantTotal, 1)) * 100);
    const coachPercentage = Math.round((coachCompleted / Math.max(coachTotal, 1)) * 100);

    // Simple statistics based on secureCareAwarded field - count per-level records
    // Count all completed records across all levels
    const totalCompleted = level1Completed + level2Completed + level3Completed + consultantCompleted + coachCompleted;
    
    // Count all in-progress records across all levels
    const totalInProgress = level1InProgress + level2InProgress + level3InProgress + consultantInProgress + coachInProgress;

    const calculatedStats = {
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


    return calculatedStats;
  }, [employees]);

  // Enhanced stats with basic employee data
  const enhancedStats = useMemo(() => {
    return {
      ...stats,
      overdueTraining: stats.totalOverdue
    };
  }, [stats]) as typeof stats & {
    overdueTraining: number;
  };

  const donutData = [
    { name: "Level 1", value: enhancedStats.completion.level1, count: enhancedStats.counts.level1.completed },
    { name: "Level 2", value: enhancedStats.completion.level2, count: enhancedStats.counts.level2.completed },
    { name: "Level 3", value: enhancedStats.completion.level3, count: enhancedStats.counts.level3.completed },
    { name: "Consultant", value: enhancedStats.completion.consultant, count: enhancedStats.counts.consultant.completed },
    { name: "Coach", value: enhancedStats.completion.coach, count: enhancedStats.counts.coach.completed },
  ].filter(item => item.value > 0); // Only show levels with completions

  // Recompute pie to reflect Completed-to-In-Progress ratio per level.
  // We normalize each level's slice so value = completed / (completed + inProgress) * 100
  // and show only levels that have completed + inProgress > 0.
  const ratioPieData = [
    {
      name: "Level 1",
      completed: enhancedStats.counts.level1.completed,
      inProgress: enhancedStats.counts.level1.inProgress,
    },
    {
      name: "Level 2",
      completed: enhancedStats.counts.level2.completed,
      inProgress: enhancedStats.counts.level2.inProgress,
    },
    {
      name: "Level 3",
      completed: enhancedStats.counts.level3.completed,
      inProgress: enhancedStats.counts.level3.inProgress,
    },
    {
      name: "Consultant",
      completed: enhancedStats.counts.consultant.completed,
      inProgress: enhancedStats.counts.consultant.inProgress,
    },
    {
      name: "Coach",
      completed: enhancedStats.counts.coach.completed,
      inProgress: enhancedStats.counts.coach.inProgress,
    },
  ]
    .map(item => {
      const denom = Math.max(item.completed + item.inProgress, 0);
      const completedPct = denom > 0 ? Math.round((item.completed / denom) * 100) : 0;
      const inProgressPct = denom > 0 ? Math.round((item.inProgress / denom) * 100) : 0;
      return {
        name: item.name,
        value: completedPct,
        inProgressPct,
        countCompleted: item.completed,
        countInProgress: item.inProgress,
        // Ensure minimum value for pie chart visibility
        minValue: 1,
      };
    });

  // Generate facility rankings (top and bottom) from actual employee data
  const facilityRankings = useMemo(() => {
    // Filter out employees with null/undefined facility names
    // Handle both 'facility' and 'Facility' field names (case sensitivity)
    const validEmployees = employees.filter(employee => {
      const facilityName = employee.facility || employee.Facility;
      return facilityName && 
        facilityName.trim() !== '' && 
        facilityName !== 'null' && 
        facilityName !== 'undefined';
    });

    if (validEmployees.length === 0) {
      return { top: [], bottom: [] };
    }

    const facilityStats = validEmployees.reduce((acc, employee) => {
      // Normalize facility name: trim, lowercase, and remove extra spaces only
      const facilityName = (employee.facility || employee.Facility)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' '); // Replace multiple spaces with single space
      
      if (!acc[facilityName]) {
        acc[facilityName] = { total: 0, completed: 0, inProgress: 0, awaiting: 0 };
      }
      acc[facilityName].total++;
      // Check if awarded using consistent logic (handles true, 1, '1')
      const isEmployeeAwarded = employee.secureCareAwarded === true || employee.secureCareAwarded === 1 || employee.secureCareAwarded === '1';
      if (isEmployeeAwarded) {
        acc[facilityName].completed++;
      } else if (employee.awaiting === 1 || employee.awaiting === true) {
        acc[facilityName].awaiting++;
      } else {
        acc[facilityName].inProgress++;
      }
      return acc;
    }, {} as Record<string, { total: number; completed: number; inProgress: number; awaiting: number }>);


    // Calculate percentages and scores for all facilities
    const WEIGHT_COMPLETED = 0.8; // give more weight to completed ratio
    const WEIGHT_INPROGRESS = 0.2; // give less weight to in-progress count comparison

    // Get max in-progress count for normalization
    const maxInProgressCount = Math.max(...Object.values(facilityStats).map(s => (s as { total: number; completed: number; inProgress: number; awaiting: number }).inProgress), 1);

    const facilityDataArray = Object.entries(facilityStats)
      .map(([normalizedName, stats]) => {
        const typedStats = stats as { total: number; completed: number; inProgress: number; awaiting: number };
        
        // Calculate completed percentage: completed / (completed + inProgress) * 100
        const completedDenom = Math.max(typedStats.completed + typedStats.inProgress, 1);
        const completedRatio = (typedStats.completed / completedDenom) * 100;
        
        // Calculate in-progress percentage: inProgress / total * 100
        const inProgressRatio = (typedStats.inProgress / Math.max(typedStats.total, 1)) * 100;
        
        // For in-progress comparison, use actual count normalized to 0-100 scale
        // This allows facilities with more employees in progress to rank higher
        const inProgressScore = maxInProgressCount > 0 ? (typedStats.inProgress / maxInProgressCount) * 100 : 0;
        
        const combinedScore = WEIGHT_COMPLETED * completedRatio + WEIGHT_INPROGRESS * inProgressScore;
        
        // Capitalize first letter of each word for display
        const displayName = normalizedName
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        return {
          name: displayName.length > 25 ? displayName.substring(0, 25) + '...' : displayName,
          fullName: displayName,
          completedRatio: Math.round(completedRatio),
          inProgressRatio: Math.round(inProgressRatio),
          inProgressScore: Math.round(inProgressScore), // New field for the actual comparison score
          combinedScore,
          completedCount: typedStats.completed,
          inProgressCount: typedStats.inProgress,
          awaitingCount: typedStats.awaiting,
          totalCount: typedStats.total,
        };
      })
      .sort((a, b) => b.combinedScore - a.combinedScore); // Sort by combined score

    // Top 5: highest combined scores
    const top = facilityDataArray.slice(0, 5);
    
    // Bottom 5: lowest combined scores
    const bottom = facilityDataArray.slice(-5).reverse();


    return { top, bottom };
  }, [employees]);

  // Generate recent activity data
  const recentActivity = useMemo(() => {
    const activities: Array<{
      id: string;
      type: 'awaiting' | 'scheduled' | 'completed' | 'rescheduled' | 'awarded' | 'conference' | 'rejected';
      employeeName: string;
      level: string;
      date: string;
      description: string;
      icon: any;
      color: string;
    }> = [];

    employees.forEach(employee => {
      const employeeName = employee.Employee || employee.name || 'Unknown Employee';
      const level = employee.awardType || 'Unknown Level';
      

      // Relias Training Completion
      if (employee.completedDate) {
        activities.push({
          id: `${employee.employeeId}-${level}-relias-completed`,
          type: 'completed',
          employeeName,
          level,
          date: employee.completedDate,
          description: `Completed Relias training for ${level}`,
          icon: CheckCircle,
          color: 'text-green-600'
        });
      }

      // Conference Completion Activities
      if (employee.conferenceCompleted) {
        if (employee.awaiting === 1 || employee.awaiting === true) {
          activities.push({
            id: `${employee.employeeId}-${level}-conference-awaiting`,
            type: 'awaiting',
            employeeName,
            level,
            date: employee.conferenceCompleted,
            description: `Conference completed, awaiting approval for ${level}`,
            icon: AlertCircle,
            color: 'text-amber-600'
          });
        } else if (employee.awaiting === false || employee.awaiting === 0) {
          activities.push({
            id: `${employee.employeeId}-${level}-conference-approved`,
            type: 'conference',
            employeeName,
            level,
            date: employee.conferenceCompleted,
            description: `Conference approved for ${level}`,
            icon: CheckCircle,
            color: 'text-green-600'
          });
        } else if (employee.awaiting === null) {
          activities.push({
            id: `${employee.employeeId}-${level}-conference-rejected`,
            type: 'rejected',
            employeeName,
            level,
            date: employee.conferenceCompleted,
            description: `Conference rejected for ${level}`,
            icon: AlertCircle,
            color: 'text-red-600'
          });
        }
      }


      // Scheduled activities
      const scheduledFields = [
        { field: 'scheduleStandingVideo', name: 'Standing Video' },
        { field: 'scheduleSleepingVideo', name: 'Sleeping Video' },
        { field: 'scheduleFeedGradVideo', name: 'Feed/Grad Video' },
        { field: 'schedulenoHandnoSpeak', name: 'No Hand/No Speak' },
        { field: 'scheduleSession1', name: 'Session 1' },
        { field: 'scheduleSession2', name: 'Session 2' },
        { field: 'scheduleSession3', name: 'Session 3' }
      ];

      scheduledFields.forEach(({ field, name }) => {
        if (employee[field]) {
          activities.push({
            id: `${employee.employeeId}-${level}-${field}`,
            type: 'scheduled',
            employeeName,
            level,
            date: employee[field],
            description: `Scheduled for ${name} in ${level}`,
            icon: Calendar,
            color: 'text-blue-600'
          });
        }
      });

      // Completed activities
      const completedFields = [
        { field: 'standingVideo', name: 'Standing Video' },
        { field: 'sleepingVideo', name: 'Sleeping Video' },
        { field: 'feedGradVideo', name: 'Feed/Grad Video' },
        { field: 'noHandnoSpeak', name: 'No Hand/No Speak' },
        { field: 'session1', name: 'Session 1' },
        { field: 'session2', name: 'Session 2' },
        { field: 'session3', name: 'Session 3' }
      ];

      completedFields.forEach(({ field, name }) => {
        if (employee[field]) {
          activities.push({
            id: `${employee.employeeId}-${level}-${field}`,
            type: 'completed',
            employeeName,
            level,
            date: employee[field],
            description: `Completed ${name} in ${level}`,
            icon: CheckCircle,
            color: 'text-green-600'
          });
        }
      });

      // Awarded - check using consistent logic (handles true, 1, '1')
      // Only include awarded activities that have a valid date to ensure accurate "latest awarded" display
      const isAwarded = employee.secureCareAwarded === true || employee.secureCareAwarded === 1 || employee.secureCareAwarded === '1';
      if (isAwarded && employee.secureCareAwardedDate) {
        // Ensure the date is valid and not null/undefined/empty string
        const awardedDate = employee.secureCareAwardedDate;
        if (awardedDate && String(awardedDate).trim() !== '' && awardedDate !== 'null' && awardedDate !== 'undefined') {
          activities.push({
            id: `${employee.employeeId}-${level}-awarded`,
            type: 'awarded',
            employeeName,
            level,
            date: awardedDate,
            description: `Has been awarded ${level}`,
            icon: Award,
            color: 'text-purple-600'
          });
        }
      }
    });

    // Return all activities - we'll sort and filter by group later to ensure accurate "latest" for each type
    return activities;
  }, [employees]);

  // Loading state with progress indicator
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
          {loadingProgress.total > 1 && (
            <p className="text-sm text-gray-500 mt-2">
              Fetching page {loadingProgress.current} of {loadingProgress.total}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Failed to load employees</p>
          <p className="text-sm text-gray-500 mt-1">{error.message}</p>
          <Button onClick={() => fetchAllEmployees()} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        icon={Home}
        title="SecureCare Dashboard"
        description="Comprehensive overview of training progress and employee performance"
      />

      <header className="sr-only">
        <h1>SecureCare Dashboard</h1>
      </header>

      {/* Data freshness indicator and refresh controls */}
      

      {/* Data source indicator */}
      

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Total Employees</CardTitle>
              <UsersRound className="h-4 w-4 text-blue-700" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">{enhancedStats.total}</div>
              <p className="text-xs text-blue-600 mt-1">Total Staff</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <Card className="shadow-sm bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-700" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-700">{enhancedStats.totalCompleted}</div>
              <p className="text-xs text-green-600 mt-1">Certifications</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="shadow-sm bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-yellow-700" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-700">{enhancedStats.totalInProgress}</div>
              <p className="text-xs text-yellow-600 mt-1">Training In Progress</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <Card className="shadow-sm bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-700">Awaiting Approvals</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-700" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-700">{enhancedStats.awaitingApprovals}</div>
              <p className="text-xs text-amber-600 mt-1">Conference approvals pending</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="shadow-sm bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Rejected</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-700" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-700">{enhancedStats.rejectedApprovals}</div>
              <p className="text-xs text-red-600 mt-1">Conference approvals rejected</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Level-wise Statistics */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Level-wise Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{enhancedStats.counts.level1.completed}</div>
              <div className="text-sm text-blue-600">Level 1 Completed</div>
              <div className="text-xs text-blue-500 mt-1">{enhancedStats.counts.level1.inProgress} in progress</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{enhancedStats.counts.level2.completed}</div>
              <div className="text-sm text-green-600">Level 2 Completed</div>
              <div className="text-xs text-green-500 mt-1">{enhancedStats.counts.level2.inProgress} in progress</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">{enhancedStats.counts.level3.completed}</div>
              <div className="text-sm text-purple-600">Level 3 Completed</div>
              <div className="text-xs text-purple-500 mt-1">{enhancedStats.counts.level3.inProgress} in progress</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-700">{enhancedStats.counts.consultant.completed}</div>
              <div className="text-sm text-orange-600">Consultant Completed</div>
              <div className="text-xs text-orange-500 mt-1">{enhancedStats.counts.consultant.inProgress} in progress</div>
            </div>
            <div className="text-center p-4 bg-teal-50 rounded-lg">
              <div className="text-2xl font-bold text-teal-700">{enhancedStats.counts.coach.completed}</div>
              <div className="text-sm text-teal-600">Coach Completed</div>
              <div className="text-xs text-teal-500 mt-1">{enhancedStats.counts.coach.inProgress} in progress</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Certification Progress
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Completed ratio by level (Completed ÷ (Completed + In Progress))
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    dataKey="value" 
                    data={ratioPieData.filter(item => item.value > 0)}
                    innerRadius={60} 
                    outerRadius={90} 
                    paddingAngle={4}
                    label={({ name, value }) => `${name}: ${value}%`}
                    labelLine={false}
                  >
                    {ratioPieData
                      .filter(item => item.value > 0)
                      .sort((a, b) => {
                        const order = ["Level 1", "Level 2", "Level 3", "Consultant", "Coach"];
                        return order.indexOf(a.name) - order.indexOf(b.name);
                      })
                      .map((item, i) => (
                        <Cell key={`ratio-${item.name}`} fill={COLORS[i % COLORS.length]} />
                      ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => {
                      const p = props?.payload || {};
                      const comp = (p.countCompleted ?? p.countCompleted === 0) ? p.countCompleted : undefined;
                      const prog = (p.countInProgress ?? p.countInProgress === 0) ? p.countInProgress : undefined;
                      const inProgPct = (p.inProgressPct ?? p.inProgressPct === 0) ? p.inProgressPct : undefined;
                      const parts = [] as string[];
                      parts.push(`${value}% completed`);
                      if (typeof inProgPct === 'number') parts.push(`${inProgPct}% in progress`);
                      if (comp !== undefined && prog !== undefined) parts.push(`(${comp} completed / ${prog} in progress)`);
                      return [parts.join(' | '), name];
                    }}
                    labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                    contentStyle={{ 
                      backgroundColor: '#f9fafb', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-sm text-gray-700">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-green-600" />
              Facility Performance (Top & Bottom 5)
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Performance by facility: completed ratio (80% weight) + in-progress count comparison (20% weight)
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-72">
                {facilityRankings.top.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <Award className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No facility data available</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={facilityRankings.top} layout="vertical" margin={{ left: 24, right: 60, top: 8, bottom: 8 }}>
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} hide={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={180} />
                      <Tooltip 
                        formatter={(value, name, props) => {
                          if (name === 'Completed') {
                            return [`${value}% (${props.payload.completedCount}/${props.payload.completedCount + props.payload.inProgressCount} completed/in-progress)`, 'Completed Ratio'];
                          } else if (name === 'In Progress') {
                            return [`${value}% (${props.payload.inProgressCount} employees in progress)`, 'In Progress Count Score'];
                          }
                          return [value, name];
                        }}
                        contentStyle={{ 
                          backgroundColor: '#f9fafb', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Bar dataKey="completedRatio" fill="#059669" radius={[0, 6, 6, 0]} name="Completed">
                        <LabelList dataKey="completedRatio" position="center" formatter={(v: number) => v > 5 ? `${v}%` : ''} style={{ fill: 'white', fontSize: 11, fontWeight: 'bold' }} />
                      </Bar>
                      <Bar dataKey="inProgressScore" fill="#2563eb" radius={[0, 6, 6, 0]} name="In Progress">
                        <LabelList dataKey="inProgressScore" position="center" formatter={(v: number) => v > 5 ? `${v}%` : ''} style={{ fill: 'white', fontSize: 11, fontWeight: 'bold' }} />
                      </Bar>
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value) => <span className="text-sm text-gray-700">{value}</span>}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="h-72">
                {facilityRankings.bottom.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <Award className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">No facility data available</p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={facilityRankings.bottom} layout="vertical" margin={{ left: 24, right: 60, top: 8, bottom: 8 }}>
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} hide={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={180} />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg max-w-xs">
                                <p className="font-semibold text-gray-900 mb-2 break-words">
                                 {data.fullName}
                                </p>
                                <div className="space-y-1">
                                  <p className="text-sm text-green-600">
                                    Completed: {data.completedRatio}% ({data.completedCount}/{data.completedCount + data.inProgressCount} completed/in-progress)
                                  </p>
                                  <p className="text-sm text-purple-600">
                                    In Progress: {data.inProgressScore}% ({data.inProgressCount} employees in progress)
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="completedRatio" fill="#dc2626" radius={[0, 6, 6, 0]} name="Completed">
                        <LabelList dataKey="completedRatio" position="center" formatter={(v: number) => v > 5 ? `${v}%` : ''} style={{ fill: 'white', fontSize: 11, fontWeight: 'bold' }} />
                      </Bar>
                      <Bar dataKey="inProgressScore" fill="#ea580c" radius={[0, 6, 6, 0]} name="In Progress">
                        <LabelList dataKey="inProgressScore" position="center" formatter={(v: number) => v > 5 ? `${v}%` : ''} style={{ fill: 'white', fontSize: 11, fontWeight: 'bold' }} />
                      </Bar>
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value) => <span className="text-sm text-gray-700">{value}</span>}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Recent Activity
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Latest activities grouped by type across all training levels
          </p>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <div className="text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No recent activity found</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group activities by type - Horizontal Layout */}
              {(() => {
                // Group activities by type first
                const groupedActivities = recentActivity.reduce((acc, activity) => {
                  if (!acc[activity.type]) {
                    acc[activity.type] = [];
                  }
                  acc[activity.type].push(activity);
                  return acc;
                }, {} as Record<string, typeof recentActivity>);

                // Sort each group by date (most recent first) and take latest 5
                // This ensures we get the truly latest items for each type, not just from a pre-filtered subset
                Object.keys(groupedActivities).forEach(type => {
                  groupedActivities[type] = groupedActivities[type]
                    .sort((a, b) => {
                      const dateA = new Date(a.date);
                      const dateB = new Date(b.date);
                      // Handle invalid dates by putting them at the end
                      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
                      if (isNaN(dateA.getTime())) return 1;
                      if (isNaN(dateB.getTime())) return -1;
                      return dateB.getTime() - dateA.getTime();
                    })
                    .slice(0, 5);
                });

                const groupConfig = {
                  scheduled: { title: 'Scheduled', icon: Calendar, color: 'blue', bgColor: 'from-blue-50 to-blue-100', borderColor: 'border-blue-200', textColor: 'text-blue-700' },
                  completed: { title: 'Completed', icon: CheckCircle, color: 'green', bgColor: 'from-green-50 to-green-100', borderColor: 'border-green-200', textColor: 'text-green-700' },
                  conference: { title: 'Conference Approved', icon: CheckCircle, color: 'emerald', bgColor: 'from-emerald-50 to-emerald-100', borderColor: 'border-emerald-200', textColor: 'text-emerald-700' },
                  awaiting: { title: 'Awaiting Approval', icon: AlertCircle, color: 'amber', bgColor: 'from-amber-50 to-amber-100', borderColor: 'border-amber-200', textColor: 'text-amber-700' },
                  awarded: { title: 'Awarded', icon: Award, color: 'purple', bgColor: 'from-purple-50 to-purple-100', borderColor: 'border-purple-200', textColor: 'text-purple-700' }
                };

                // Show all groups, even if empty
                const allGroupTypes = ['scheduled', 'completed', 'conference', 'awaiting', 'awarded'];
                const activityGroups = allGroupTypes.map(type => {
                  const activities = groupedActivities[type] || [];
                  const config = groupConfig[type as keyof typeof groupConfig];
                  return { type, activities, config };
                });

                return (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {activityGroups.map(({ type, activities, config }, groupIndex) => {
                      const IconComponent = config.icon;
                      
                      return (
                        <motion.div
                          key={type}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: groupIndex * 0.1 }}
                          className={`bg-gradient-to-br ${config.bgColor} ${config.borderColor} border rounded-xl p-4 h-fit`}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center border-2 border-${config.color}-300 shadow-sm`}>
                              <IconComponent className={`w-5 h-5 text-${config.color}-600`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className={`font-semibold ${config.textColor} text-base`}>{config.title}</h3>
                              <p className="text-sm text-gray-600">{activities.length} {activities.length === 1 ? 'item' : 'items'}</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {activities.length === 0 ? (
                              <div className="text-center py-4">
                                <div className={`w-8 h-8 rounded-full bg-${config.color}-100 flex items-center justify-center mx-auto mb-2`}>
                                  <IconComponent className={`w-4 h-4 text-${config.color}-400`} />
                                </div>
                                <p className="text-sm text-gray-500">No recent activities</p>
                              </div>
                            ) : (
                              activities.slice(0, 5).map((activity, index) => {
                                const ActivityIcon = activity.icon;
                                return (
                                  <motion.div
                                    key={activity.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.2, delay: index * 0.05 }}
                                    className="bg-white/70 backdrop-blur-sm rounded-lg p-2.5 shadow-sm hover:shadow-md transition-all duration-200 border border-white/50"
                                  >
                                    <div className="flex items-start gap-2">
                                      <div className={`flex-shrink-0 w-5 h-5 rounded-full bg-${config.color}-100 flex items-center justify-center`}>
                                        <ActivityIcon className={`w-2.5 h-2.5 text-${config.color}-600`} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                          {activity.employeeName}
                                        </p>
                                        <p className="text-sm text-gray-600 mt-0.5">
                                          {activity.description}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-0.5">
                                          {formatActivityDate(activity.date)}
                                        </p>
                                      </div>
                                    </div>
                                  </motion.div>
                                );
                              })
                            )}
                          </div>
                          
                          {activities.length > 5 && (
                            <div className="mt-3 text-center">
                              <span className="text-sm text-gray-500">
                                +{activities.length - 5} more {activities.length - 5 === 1 ? 'item' : 'items'}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
