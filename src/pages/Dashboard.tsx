import { useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, FileText, Plus, UsersRound, Clock, CheckCircle, AlertCircle, TrendingUp } from "lucide-react";
import { Pie, PieChart, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";

const COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444"];

export default function Dashboard() {
  const { state } = useApp();

  useEffect(() => {
    document.title = "SecureCare Training Dashboard";
  }, []);

  const stats = useMemo(() => {
    const total = state.employees.length;
    
    // Calculate completion rates for each level
    const level1Completed = state.employees.filter(e => e.level1Awarded).length;
    const level2Completed = state.employees.filter(e => e.level2Awarded).length;
    const level3Completed = state.employees.filter(e => e.level3Awarded).length;
    const consultantCompleted = state.employees.filter(e => e.consultantAwarded).length;
    const coachCompleted = state.employees.filter(e => e.coachAwarded).length;

    // Calculate in-progress counts
    const level1InProgress = state.employees.filter(e => e.level1ReliasAssigned && !e.level1Awarded).length;
    const level2InProgress = state.employees.filter(e => e.level2ReliasAssigned && !e.level2Awarded).length;
    const level3InProgress = state.employees.filter(e => e.level3ReliasAssigned && !e.level3Awarded).length;
    const consultantInProgress = state.employees.filter(e => e.consultantReliasAssigned && !e.consultantAwarded).length;
    const coachInProgress = state.employees.filter(e => e.coachReliasAssigned && !e.coachAwarded).length;

    // Calculate pending counts
    const level1Pending = state.employees.filter(e => !e.level1ReliasAssigned).length;
    const level2Pending = state.employees.filter(e => e.level1Awarded && !e.level2ReliasAssigned).length;
    const level3Pending = state.employees.filter(e => e.level2Awarded && !e.level3ReliasAssigned).length;
    const consultantPending = state.employees.filter(e => e.level3Awarded && !e.consultantReliasAssigned).length;
    const coachPending = state.employees.filter(e => e.consultantAwarded && !e.coachReliasAssigned).length;

    // Calculate overdue (assigned but not completed within expected timeframe)
    const level1Overdue = state.employees.filter(e => 
      e.level1ReliasAssigned && !e.level1Awarded && 
      new Date(e.level1ReliasAssigned.getTime() + 30 * 24 * 60 * 60 * 1000) < new Date()
    ).length;
    const level2Overdue = state.employees.filter(e => 
      e.level2ReliasAssigned && !e.level2Awarded && 
      new Date(e.level2ReliasAssigned.getTime() + 45 * 24 * 60 * 60 * 1000) < new Date()
    ).length;
    const level3Overdue = state.employees.filter(e => 
      e.level3ReliasAssigned && !e.level3Awarded && 
      new Date(e.level3ReliasAssigned.getTime() + 60 * 24 * 60 * 60 * 1000) < new Date()
    ).length;

    // Calculate completion percentages
    const level1Percentage = Math.round((level1Completed / Math.max(total, 1)) * 100);
    const level2Percentage = Math.round((level2Completed / Math.max(level1Completed, 1)) * 100);
    const level3Percentage = Math.round((level3Completed / Math.max(level2Completed, 1)) * 100);
    const consultantPercentage = Math.round((consultantCompleted / Math.max(level3Completed, 1)) * 100);
    const coachPercentage = Math.round((coachCompleted / Math.max(consultantCompleted, 1)) * 100);

    return {
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
  }, [state.employees]);

  const donutData = [
    { name: "Level 1", value: stats.completion.level1 },
    { name: "Level 2", value: stats.completion.level2 },
    { name: "Level 3", value: stats.completion.level3 },
    { name: "Consultant", value: stats.completion.consultant },
    { name: "Coach", value: stats.completion.coach },
  ];

  // Generate facility data from actual employee data
  const facilityData = useMemo(() => {
    const facilityStats = state.employees.reduce((acc, employee) => {
      if (!acc[employee.facility]) {
        acc[employee.facility] = { total: 0, completed: 0 };
      }
      acc[employee.facility].total++;
      if (employee.level1Awarded || employee.level2Awarded || employee.level3Awarded || employee.consultantAwarded || employee.coachAwarded) {
        acc[employee.facility].completed++;
      }
      return acc;
    }, {} as Record<string, { total: number; completed: number }>);

    return Object.entries(facilityStats)
      .map(([name, stats]) => ({
        name,
        completed: Math.round((stats.completed / Math.max(stats.total, 1)) * 100)
      }))
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 5); // Top 5 facilities
  }, [state.employees]);

  return (
    <div className="space-y-6">
      <header className="sr-only">
        <h1>SecureCare Training Dashboard</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Total Employees</CardTitle>
              <UsersRound className="h-4 w-4 text-blue-700" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-700">{stats.total}</div>
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
              <div className="text-3xl font-bold text-green-700">{stats.totalCompleted}</div>
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
              <div className="text-3xl font-bold text-yellow-700">{stats.totalInProgress}</div>
              <p className="text-xs text-yellow-600 mt-1">Active Training</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <Card className="shadow-sm bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-700">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-700" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-700">{stats.totalOverdue}</div>
              <p className="text-xs text-red-600 mt-1">Needs Attention</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

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
              <div className="text-2xl font-bold text-blue-700">{stats.counts.level1.completed}</div>
              <div className="text-sm text-blue-600">Level 1 Completed</div>
              <div className="text-xs text-blue-500 mt-1">{stats.counts.level1.inProgress} in progress</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{stats.counts.level2.completed}</div>
              <div className="text-sm text-green-600">Level 2 Completed</div>
              <div className="text-xs text-green-500 mt-1">{stats.counts.level2.inProgress} in progress</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">{stats.counts.level3.completed}</div>
              <div className="text-sm text-purple-600">Level 3 Completed</div>
              <div className="text-xs text-purple-500 mt-1">{stats.counts.level3.inProgress} in progress</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-700">{stats.counts.consultant.completed}</div>
              <div className="text-sm text-orange-600">Consultant Completed</div>
              <div className="text-xs text-orange-500 mt-1">{stats.counts.consultant.inProgress} in progress</div>
            </div>
            <div className="text-center p-4 bg-teal-50 rounded-lg">
              <div className="text-2xl font-bold text-teal-700">{stats.counts.coach.completed}</div>
              <div className="text-sm text-teal-600">Coach Completed</div>
              <div className="text-xs text-teal-500 mt-1">{stats.counts.coach.inProgress} in progress</div>
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
              {state.employees
                .filter(e => e.level1AwardedDate || e.level2AwardedDate || e.level3AwardedDate || e.consultantAwardedDate || e.coachAwardedDate)
                .sort((a, b) => {
                  const aDate = a.level1AwardedDate || a.level2AwardedDate || a.level3AwardedDate || a.consultantAwardedDate || a.coachAwardedDate;
                  const bDate = b.level1AwardedDate || b.level2AwardedDate || b.level3AwardedDate || b.consultantAwardedDate || b.coachAwardedDate;
                  return bDate.getTime() - aDate.getTime();
                })
                .slice(0, 5)
                .map((employee, index) => {
                  const awardDate = employee.level1AwardedDate || employee.level2AwardedDate || employee.level3AwardedDate || employee.consultantAwardedDate || employee.coachAwardedDate;
                  const level = employee.coachAwardedDate ? 'Coach' : 
                               employee.consultantAwardedDate ? 'Consultant' : 
                               employee.level3AwardedDate ? 'Level 3' : 
                               employee.level2AwardedDate ? 'Level 2' : 'Level 1';
                  
                  const daysAgo = Math.floor((new Date().getTime() - awardDate.getTime()) / (1000 * 60 * 60 * 24));
                  const timeText = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`;
                  
                  return (
                    <li key={employee.employeeId} className="flex items-center justify-between rounded-md border p-3 hover:bg-gray-50 transition-colors">
                      <span className="font-medium">{employee.name} completed {level}</span>
                      <span className="text-xs text-muted-foreground">{timeText}</span>
                    </li>
                  );
                })}
              {state.employees.filter(e => e.level1AwardedDate || e.level2AwardedDate || e.level3AwardedDate || e.consultantAwardedDate || e.coachAwardedDate).length === 0 && (
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
            <Button variant="hero" className="hover-scale"><Plus className="mr-2" /> Assign Training</Button>
            <Button variant="secondary" className="hover-scale"><FileText className="mr-2" /> Run Report</Button>
            <Button variant="outline" className="hover-scale"><Award className="mr-2" /> Manage Certifications</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
