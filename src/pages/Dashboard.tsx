import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, FileText, UsersRound, Clock, CheckCircle, AlertCircle, TrendingUp, Home, Calendar } from "lucide-react";
import { Pie, PieChart, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, LabelList } from "recharts";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { useTrainingEmployees } from "@/hooks/useEmployees";
import { useTrainingData } from "@/hooks/useTrainingData";
import { parseDate } from "@/config/awardTypes";
import PageHeader from "@/components/PageHeader";

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"];

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

  // For Dashboard, we need all employee records to calculate accurate stats
  const { employees: apiEmployees, isLoading, error, isFetching, refetch } = useTrainingEmployees({ level: 'all' }, 10000);
  
  // Note: allTrainingData not available in useTrainingData hook, using employee data instead
  const isLoadingAll = false;

  useEffect(() => {
    document.title = "SecureCare Training Dashboard";
  }, []);

  // Auto-refresh when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetch]);

  // Use API employees if available, otherwise fall back to state employees
  // This ensures the Dashboard always has data to display
  const employees = useMemo(() => {
    if (apiEmployees && apiEmployees.length > 0) {
      return apiEmployees;
    } else if (state.employees && state.employees.length > 0) {
      return state.employees;
    } else {
      return [];
    }
  }, [apiEmployees, state.employees]);

  // Debug logging
  useEffect(() => {
    // Employee count tracking removed
  }, [apiEmployees, state.employees, employees]);

  const stats = useMemo(() => {
    // Get unique employees count (one record per employeeNumber)
    const uniqueEmployeeNumbers = new Set(employees.map(e => e.employeeNumber));
    const total = uniqueEmployeeNumbers.size;
    
    // Get unique employees (one record per employee with highest status)
    const uniqueEmployees = employees.filter((employee, index, arr) => 
      arr.findIndex(e => e.employeeNumber === employee.employeeNumber) === index
    );
    
    // Calculate completion rates for each level using correct database fields
    const level1Completed = uniqueEmployees.filter(e => e.awardType === 'Level 1' && e.secureCareAwarded).length;
    const level2Completed = uniqueEmployees.filter(e => e.awardType === 'Level 2' && e.secureCareAwarded).length;
    const level3Completed = uniqueEmployees.filter(e => e.awardType === 'Level 3' && e.secureCareAwarded).length;
    const consultantCompleted = uniqueEmployees.filter(e => e.awardType === 'Consultant' && e.secureCareAwarded).length;
    const coachCompleted = uniqueEmployees.filter(e => e.awardType === 'Coach' && e.secureCareAwarded).length;

    // Calculate in-progress counts - employees whose conference has been completed AND approved (not awaiting)
    const level1InProgress = uniqueEmployees.filter(e => 
      e.awardType === 'Level 1' && e.conferenceCompleted && e.conferenceCompleted.trim() !== '' && 
      e.awaiting !== 1 && e.awaiting !== true
    ).length;
    const level2InProgress = uniqueEmployees.filter(e => 
      e.awardType === 'Level 2' && e.conferenceCompleted && e.conferenceCompleted.trim() !== '' && 
      e.awaiting !== 1 && e.awaiting !== true
    ).length;
    const level3InProgress = uniqueEmployees.filter(e => 
      e.awardType === 'Level 3' && e.conferenceCompleted && e.conferenceCompleted.trim() !== '' && 
      e.awaiting !== 1 && e.awaiting !== true
    ).length;
    const consultantInProgress = uniqueEmployees.filter(e => 
      e.awardType === 'Consultant' && e.conferenceCompleted && e.conferenceCompleted.trim() !== '' && 
      e.awaiting !== 1 && e.awaiting !== true
    ).length;
    const coachInProgress = uniqueEmployees.filter(e => 
      e.awardType === 'Coach' && e.conferenceCompleted && e.conferenceCompleted.trim() !== '' && 
      e.awaiting !== 1 && e.awaiting !== true
    ).length;

    // Calculate pending counts (no award type assigned yet)
    const level1Pending = employees.filter(e => !e.awardType || e.awardType === 'Level 1' && !e.assignedDate).length;
    const level2Pending = employees.filter(e => e.awardType === 'Level 1' && e.secureCareAwarded && !employees.some(emp => emp.employeeId === e.employeeId && emp.awardType === 'Level 2')).length;
    const level3Pending = employees.filter(e => e.awardType === 'Level 2' && e.secureCareAwarded && !employees.some(emp => emp.employeeId === e.employeeId && emp.awardType === 'Level 3')).length;
    const consultantPending = employees.filter(e => e.awardType === 'Level 3' && e.secureCareAwarded && !employees.some(emp => emp.employeeId === e.employeeId && emp.awardType === 'Consultant')).length;
    const coachPending = employees.filter(e => e.awardType === 'Consultant' && e.secureCareAwarded && !employees.some(emp => emp.employeeId === e.employeeId && emp.awardType === 'Coach')).length;

    // Calculate overdue (assigned but not completed within expected timeframe)
    const level1Overdue = employees.filter(e => {
      if (e.awardType !== 'Level 1' || !e.assignedDate || e.secureCareAwarded) return false;
      const assignedDate = parseDate(e.assignedDate);
      if (!assignedDate) return false;
      const overdueDate = new Date(assignedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      return overdueDate < new Date();
    }).length;
    const level2Overdue = employees.filter(e => {
      if (e.awardType !== 'Level 2' || !e.assignedDate || e.secureCareAwarded) return false;
      const assignedDate = parseDate(e.assignedDate);
      if (!assignedDate) return false;
      const overdueDate = new Date(assignedDate.getTime() + 45 * 24 * 60 * 60 * 1000);
      return overdueDate < new Date();
    }).length;
    const level3Overdue = employees.filter(e => {
      if (e.awardType !== 'Level 3' || !e.assignedDate || e.secureCareAwarded) return false;
      const assignedDate = parseDate(e.assignedDate);
      if (!assignedDate) return false;
      const overdueDate = new Date(assignedDate.getTime() + 60 * 24 * 60 * 60 * 1000);
      return overdueDate < new Date();
    }).length;

    // Awaiting approvals (L2+ conference completed but awaiting approval or simply flagged awaiting=0)
    const awaitingApprovals = uniqueEmployees.filter(e => {
      if (e.awardType === 'Level 1') return false;
        return e.awaiting === 1 || e.awaiting === true; // 1 or true => awaiting approval
    }).length;

    // Rejected approvals (conference completed but awaiting=null, indicating rejection)
    // Use all employees, not just unique ones, to match completion page logic
    const rejectedEmployees = employees.filter(e => {
      return e.conferenceCompleted && e.conferenceCompleted.trim() !== '' && e.awaiting === null;
    });
    const rejectedApprovals = rejectedEmployees.length;
    

    // Calculate completion percentages
    const level1Percentage = Math.round((level1Completed / Math.max(total, 1)) * 100);
    const level2Percentage = Math.round((level2Completed / Math.max(level1Completed, 1)) * 100);
    const level3Percentage = Math.round((level3Completed / Math.max(level2Completed, 1)) * 100);
    const consultantPercentage = Math.round((consultantCompleted / Math.max(level3Completed, 1)) * 100);
    const coachPercentage = Math.round((coachCompleted / Math.max(consultantCompleted, 1)) * 100);

    // Simple statistics based on secureCareAwarded field - count unique employees
    // Count unique employees where secureCareAwarded = 1
    const totalCompleted = uniqueEmployees.filter(e => e.secureCareAwarded === 1 || e.secureCareAwarded === true).length;
    
    // Count unique employees where conference has been completed AND approved (not awaiting)
    const totalInProgress = uniqueEmployees.filter(e => 
      e.conferenceCompleted && e.conferenceCompleted.trim() !== '' && 
      e.awaiting !== 1 && e.awaiting !== true
    ).length;

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
      const facilityName = (employee.facility || employee.Facility).trim();
      if (!acc[facilityName]) {
        acc[facilityName] = { total: 0, completed: 0, inProgress: 0, awaiting: 0 };
      }
      acc[facilityName].total++;
      if (employee.secureCareAwarded === 1 || employee.secureCareAwarded === true) {
        acc[facilityName].completed++;
      } else if (employee.awaiting === 1 || employee.awaiting === true) {
        acc[facilityName].awaiting++;
      } else {
        acc[facilityName].inProgress++;
      }
      return acc;
    }, {} as Record<string, { total: number; completed: number; inProgress: number; awaiting: number }>);

    const facilityDataArray = Object.entries(facilityStats)
      .map(([name, stats]) => {
        const typedStats = stats as { total: number; completed: number; inProgress: number; awaiting: number };
        return {
          name: name.length > 20 ? name.substring(0, 20) + '...' : name, // Truncate long names
          fullName: name, // Keep full name for tooltip
          completed: Math.round((typedStats.completed / Math.max(typedStats.total, 1)) * 100),
          inProgress: Math.round((typedStats.inProgress / Math.max(typedStats.total, 1)) * 100),
          completedCount: typedStats.completed,
          totalCount: typedStats.total,
          inProgressCount: typedStats.inProgress,
          awaitingCount: typedStats.awaiting
        };
      })
      .sort((a, b) => b.completed - a.completed);

    const top = facilityDataArray.slice(0, 5);
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

      // Awarded
      if (employee.secureCareAwarded === 1 || employee.secureCareAwarded === true) {
        activities.push({
          id: `${employee.employeeId}-${level}-awarded`,
          type: 'awarded',
          employeeName,
          level,
          date: employee.secureCareAwardedDate || new Date().toISOString().split('T')[0],
          description: `Has been awarded ${level}`,
          icon: Award,
          color: 'text-purple-600'
        });
      }
    });

    // Sort by date (most recent first) and take top 200 to ensure we have enough for each group
    const sortedActivities = activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 200);

    return sortedActivities;
  }, [employees]);

  // Loading state
  if (isLoading || isLoadingAll) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard data...</p>
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
          <Button onClick={() => window.location.reload()} className="mt-2">
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
              Completion rates by certification level
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    dataKey="value" 
                    data={donutData} 
                    innerRadius={60} 
                    outerRadius={90} 
                    paddingAngle={4}
                    label={({ name, value }) => `${name}: ${value}%`}
                    labelLine={false}
                  >
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => [
                      `${value}% (${props.payload.count} completed)`, 
                      name
                    ]}
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
              Completion rates by facility (all training records)
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
                    <BarChart data={[...facilityRankings.top].reverse()} layout="vertical" margin={{ left: 24, right: 60, top: 8, bottom: 8 }}>
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} hide={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
                      <Tooltip 
                        formatter={(value, name, props) => {
                          if (name === 'Completed') {
                            return [`${value}% (${props.payload.completedCount}/${props.payload.totalCount} records)`, 'Completed %'];
                          } else if (name === 'In Progress') {
                            return [`${value}% (${props.payload.inProgressCount}/${props.payload.totalCount} records)`, 'In Progress %'];
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
                      <Bar dataKey="completed" fill="#10b981" radius={[0, 6, 6, 0]} name="Completed">
                        <LabelList dataKey="completed" position="center" formatter={(v: number) => v > 5 ? `${v}%` : ''} style={{ fill: 'white', fontSize: 11, fontWeight: 'bold' }} />
                      </Bar>
                      <Bar dataKey="inProgress" fill="#8b5cf6" radius={[0, 6, 6, 0]} name="In Progress">
                        <LabelList dataKey="inProgress" position="center" formatter={(v: number) => v > 5 ? `${v}%` : ''} style={{ fill: 'white', fontSize: 11, fontWeight: 'bold' }} />
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
                    <BarChart data={[...facilityRankings.bottom]} layout="vertical" margin={{ left: 24, right: 60, top: 8, bottom: 8 }}>
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} hide={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
                      <Tooltip 
                        formatter={(value, name, props) => {
                          if (name === 'Completed') {
                            return [`${value}% (${props.payload.completedCount}/${props.payload.totalCount} records)`, 'Completed %'];
                          } else if (name === 'In Progress') {
                            return [`${value}% (${props.payload.inProgressCount}/${props.payload.totalCount} records)`, 'In Progress %'];
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
                      <Bar dataKey="completed" fill="#ef4444" radius={[0, 6, 6, 0]} name="Completed">
                        <LabelList dataKey="completed" position="center" formatter={(v: number) => v > 5 ? `${v}%` : ''} style={{ fill: 'white', fontSize: 11, fontWeight: 'bold' }} />
                      </Bar>
                      <Bar dataKey="inProgress" fill="#8b5cf6" radius={[0, 6, 6, 0]} name="In Progress">
                        <LabelList dataKey="inProgress" position="center" formatter={(v: number) => v > 5 ? `${v}%` : ''} style={{ fill: 'white', fontSize: 11, fontWeight: 'bold' }} />
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
                const groupedActivities = recentActivity.reduce((acc, activity) => {
                  if (!acc[activity.type]) {
                    acc[activity.type] = [];
                  }
                  acc[activity.type].push(activity);
                  return acc;
                }, {} as Record<string, typeof recentActivity>);

                // Sort each group by date (most recent first) and take latest 5
                Object.keys(groupedActivities).forEach(type => {
                  groupedActivities[type] = groupedActivities[type]
                    .sort((a, b) => {
                      const dateA = new Date(a.date);
                      const dateB = new Date(b.date);
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
