import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, FileText, Plus, UsersRound, Clock, CheckCircle, AlertCircle, TrendingUp, RefreshCw, Home } from "lucide-react";
import { Pie, PieChart, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { useEmployees } from "@/hooks/useEmployees";
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

export default function Dashboard() {
  const { state } = useApp();

  // For Dashboard, we need limited employees, so we'll use the default page size
  // and also fall back to state.employees if the API data is not available
  const { employees: apiEmployees, isLoading, error, isFetching } = useEmployees({});
  // Note: allTrainingData not available in useTrainingData hook, using employee data instead
  const isLoadingAll = false;

  useEffect(() => {
    document.title = "SecureCare Training Dashboard";
  }, []);

  // Use API employees if available, otherwise fall back to state employees
  // This ensures the Dashboard always has data to display
  const employees = useMemo(() => {
    if (apiEmployees && apiEmployees.length > 0) {
      console.log('Dashboard: Using API employees:', apiEmployees.length);
      return apiEmployees;
    } else if (state.employees && state.employees.length > 0) {
      console.log('Dashboard: Using state employees:', state.employees.length);
      return state.employees;
    } else {
      console.log('Dashboard: No employees available');
      return [];
    }
  }, [apiEmployees, state.employees]);

  // Debug logging
  useEffect(() => {
    console.log('Dashboard: API employees count:', apiEmployees?.length || 0);
    console.log('Dashboard: State employees count:', state.employees?.length || 0);
    console.log('Dashboard: Final employees count:', employees.length);
  }, [apiEmployees, state.employees, employees]);

  const stats = useMemo(() => {
    const total = employees.length;
    console.log('Dashboard: Calculating stats for', total, 'employees');
    
    // Calculate completion rates for each level using correct database fields
    const level1Completed = employees.filter(e => e.awardType === 'Level 1' && e.secureCareAwarded).length;
    const level2Completed = employees.filter(e => e.awardType === 'Level 2' && e.secureCareAwarded).length;
    const level3Completed = employees.filter(e => e.awardType === 'Level 3' && e.secureCareAwarded).length;
    const consultantCompleted = employees.filter(e => e.awardType === 'Consultant' && e.secureCareAwarded).length;
    const coachCompleted = employees.filter(e => e.awardType === 'Coach' && e.secureCareAwarded).length;

    // Calculate in-progress counts
    const level1InProgress = employees.filter(e => e.awardType === 'Level 1' && e.assignedDate && !e.secureCareAwarded).length;
    const level2InProgress = employees.filter(e => e.awardType === 'Level 2' && e.assignedDate && !e.secureCareAwarded).length;
    const level3InProgress = employees.filter(e => e.awardType === 'Level 3' && e.assignedDate && !e.secureCareAwarded).length;
    const consultantInProgress = employees.filter(e => e.awardType === 'Consultant' && e.assignedDate && !e.secureCareAwarded).length;
    const coachInProgress = employees.filter(e => e.awardType === 'Coach' && e.assignedDate && !e.secureCareAwarded).length;

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

    // Calculate completion percentages
    const level1Percentage = Math.round((level1Completed / Math.max(total, 1)) * 100);
    const level2Percentage = Math.round((level2Completed / Math.max(level1Completed, 1)) * 100);
    const level3Percentage = Math.round((level3Completed / Math.max(level2Completed, 1)) * 100);
    const consultantPercentage = Math.round((consultantCompleted / Math.max(level3Completed, 1)) * 100);
    const coachPercentage = Math.round((coachCompleted / Math.max(consultantCompleted, 1)) * 100);

    const calculatedStats = {
      total,
      totalCompleted: level1Completed + level2Completed + level3Completed + consultantCompleted + coachCompleted,
      totalInProgress: level1InProgress + level2InProgress + level3InProgress + consultantInProgress + coachInProgress,
      totalPending: level1Pending + level2Pending + level3Pending + consultantPending + coachPending,
      totalOverdue: level1Overdue + level2Overdue + level3Overdue,
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

    console.log('Dashboard: Calculated stats:', calculatedStats);
    return calculatedStats;
  }, [employees]);

  // Enhanced stats with basic employee data (no real-time training data available)
  const enhancedStats = useMemo(() => {
    // Use basic stats without real-time training integration
    return {
      ...stats,
      activeTrainingSessions: 0,
      overdueTraining: stats.totalOverdue,
      recentCompletions: 0
    };
  }, [stats]) as typeof stats & {
    activeTrainingSessions: number;
    overdueTraining: number;
    recentCompletions: number;
  };

  const donutData = [
    { name: "Level 1", value: enhancedStats.completion.level1 },
    { name: "Level 2", value: enhancedStats.completion.level2 },
    { name: "Level 3", value: enhancedStats.completion.level3 },
    { name: "Consultant", value: enhancedStats.completion.consultant },
    { name: "Coach", value: enhancedStats.completion.coach },
  ];

  // Generate facility data from actual employee data using correct database fields
  const facilityData = useMemo(() => {
    const facilityStats = employees.reduce((acc, employee) => {
      if (!acc[employee.facility]) {
        acc[employee.facility] = { total: 0, completed: 0 };
      }
      acc[employee.facility].total++;
      if (employee.secureCareAwarded) {
        acc[employee.facility].completed++;
      }
      return acc;
    }, {} as Record<string, { total: number; completed: number }>);

    return Object.entries(facilityStats)
      .map(([name, stats]) => ({
        name,
        completed: Math.round(((stats as any).completed / Math.max((stats as any).total, 1)) * 100)
      }))
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 5); // Top 5 facilities
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
      

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Total Employees</CardTitle>
              <UsersRound className="h-4 w-4 text-blue-700" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">{enhancedStats.total}</div>
              <p className="text-xs text-blue-600 mt-1">Active Staff</p>
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
              <p className="text-xs text-yellow-600 mt-1">Active Training</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <Card className="shadow-sm bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Overdue Training</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-700" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-700">
                {enhancedStats.totalOverdue}
              </div>
              <p className="text-xs text-red-600 mt-1">
                Training overdue
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Additional stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-sm bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-indigo-700">Active Sessions</CardTitle>
            <Clock className="h-4 w-4 text-indigo-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">{enhancedStats.activeTrainingSessions}</div>
            <p className="text-xs text-indigo-600 mt-1">Current Training</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700">Recent Completions</CardTitle>
            <CheckCircle className="h-4 w-4 text-orange-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{enhancedStats.recentCompletions}</div>
            <p className="text-xs text-orange-600 mt-1">Last 7 Days</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Training Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {employees.length > 0 ? 
                Math.round((employees.filter(e => e.secureCareAwarded).length / employees.length) * 100) : 0}%
            </div>
            <p className="text-xs text-purple-600 mt-1">Completion Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Training Details - Actionable Information */}
      {enhancedStats.overdueTraining > 0 && (
        <Card className="shadow-sm border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              Overdue Training Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-700">
                  {enhancedStats.overdueTraining} training sessions are overdue
                </span>
                <span className="text-xs text-red-600">
                  Scheduled dates have passed
                </span>
              </div>
              
              {/* Action Cards */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="p-3 bg-white rounded-lg border border-red-200">
                  <div className="text-sm font-medium text-red-700">Action Required</div>
                  <div className="text-xs text-red-600 mt-1">
                    Reschedule or mark as complete
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-red-200">
                  <div className="text-sm font-medium text-red-700">Contact Needed</div>
                  <div className="text-xs text-red-600 mt-1">
                    Reach out to employees
                  </div>
                </div>
                <div className="p-3 bg-white rounded-lg border border-red-200">
                  <div className="text-sm font-medium text-red-700">Update Status</div>
                  <div className="text-xs text-red-600 mt-1">
                    Mark completed if done
                  </div>
                </div>
              </div>

              {/* Overdue Training List */}
              <div className="mt-4">
                <div className="text-sm font-medium text-red-700 mb-2">Overdue Employees:</div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {employees
                    .filter(e => {
                      if (!e.assignedDate || e.secureCareAwarded) return false;
                      const assignedDate = new Date(e.assignedDate);
                      const overdueDate = new Date(assignedDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                      return overdueDate < new Date();
                    })
                    .slice(0, 5) // Show top 5 overdue
                    .map((employee, index) => {
                      const assignedDate = new Date(employee.assignedDate);
                      const daysOverdue = Math.ceil((new Date().getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24));
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-2 bg-white rounded border border-red-200">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-700">
                              {employee.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {employee.awardType || 'Training'} - {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                            </div>
                          </div>
                          <div className="text-xs text-red-600 font-medium">
                            {new Date(employee.assignedDate).toLocaleDateString()}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Certification Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie dataKey="value" data={donutData} innerRadius={60} outerRadius={90} paddingAngle={4}>
                    {donutData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-green-600" />
              Top Facilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facilityData}>
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="completed" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {employees
                .filter(e => e.secureCareAwardedDate)
                .sort((a, b) => {
                  const aDate = new Date(a.secureCareAwardedDate);
                  const bDate = new Date(b.secureCareAwardedDate);
                  return bDate.getTime() - aDate.getTime();
                })
                .slice(0, 5)
                .map((employee, index) => {
                  const awardDate = new Date(employee.secureCareAwardedDate);
                  const level = employee.awardType || 'Level 1';
                  
                  const daysAgo = Math.floor((new Date().getTime() - awardDate.getTime()) / (1000 * 60 * 60 * 24));
                  const timeText = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`;
                  
                  return (
                    <li key={employee.employeeId} className="flex items-center justify-between rounded-md border p-3 hover:bg-gray-50 transition-colors">
                      <span className="font-medium">{employee.name} completed {level}</span>
                      <span className="text-xs text-muted-foreground">{timeText}</span>
                    </li>
                  );
                })}
              {employees.filter(e => e.secureCareAwardedDate).length === 0 && (
                <li className="text-center text-muted-foreground py-4">
                  No recent activity
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="default" className="hover-scale"><Plus className="mr-2" /> Assign Training</Button>
            <Button variant="secondary" className="hover-scale"><FileText className="mr-2" /> Run Report</Button>
            <Button variant="outline" className="hover-scale"><Award className="mr-2" /> Manage Certifications</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
