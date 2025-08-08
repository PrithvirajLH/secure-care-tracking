import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, 
  Award, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  PlayCircle,
  Calendar,
  FileText,
  Video,
  GraduationCap,
  Star,
  TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import TrainingAssignmentWizard from "@/components/TrainingAssignmentWizard";
import { toast } from "sonner";

interface LevelStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  completionRate: number;
}

export default function Training() {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState("care-partner");

  const handleTrainingAssignment = (assignments: any[]) => {
    // In a real application, this would update the backend
    console.log("Training assignments:", assignments);
    toast.success(`Assigned training to ${assignments.length} employees`);
  };

  // Calculate statistics for each level
  const levelStats = useMemo(() => {
    const stats: Record<string, LevelStats> = {
      "care-partner": {
        total: state.employees.length,
        completed: state.employees.filter(e => e.level1Awarded).length,
        inProgress: state.employees.filter(e => e.level1ReliasAssigned && !e.level1ReliasCompleted).length,
        pending: state.employees.filter(e => !e.level1ReliasAssigned).length,
        overdue: state.employees.filter(e => e.level1ReliasAssigned && !e.level1ReliasCompleted && 
          new Date(e.level1ReliasAssigned.getTime() + 30 * 24 * 60 * 60 * 1000) < new Date()).length,
        completionRate: Math.round((state.employees.filter(e => e.level1Awarded).length / Math.max(state.employees.length, 1)) * 100)
      },
      "associate": {
        total: state.employees.filter(e => e.level1Awarded).length,
        completed: state.employees.filter(e => e.level2Awarded).length,
        inProgress: state.employees.filter(e => e.level2ReliasAssigned && !e.level2ReliasCompleted).length,
        pending: state.employees.filter(e => e.level1Awarded && !e.level2ReliasAssigned).length,
        overdue: state.employees.filter(e => e.level2ReliasAssigned && !e.level2ReliasCompleted && 
          new Date(e.level2ReliasAssigned.getTime() + 45 * 24 * 60 * 60 * 1000) < new Date()).length,
        completionRate: Math.round((state.employees.filter(e => e.level2Awarded).length / Math.max(state.employees.filter(e => e.level1Awarded).length, 1)) * 100)
      },
      "champion": {
        total: state.employees.filter(e => e.level2Awarded).length,
        completed: state.employees.filter(e => e.level3Awarded).length,
        inProgress: state.employees.filter(e => e.level3ReliasAssigned && !e.level3ReliasCompleted).length,
        pending: state.employees.filter(e => e.level2Awarded && !e.level3ReliasAssigned).length,
        overdue: state.employees.filter(e => e.level3ReliasAssigned && !e.level3ReliasCompleted && 
          new Date(e.level3ReliasAssigned.getTime() + 60 * 24 * 60 * 60 * 1000) < new Date()).length,
        completionRate: Math.round((state.employees.filter(e => e.level3Awarded).length / Math.max(state.employees.filter(e => e.level2Awarded).length, 1)) * 100)
      },
      "consultant": {
        total: state.employees.filter(e => e.level3Awarded).length,
        completed: state.employees.filter(e => e.consultantAwarded).length,
        inProgress: state.employees.filter(e => e.consultantReliasAssigned && !e.consultantReliasCompleted).length,
        pending: state.employees.filter(e => e.level3Awarded && !e.consultantReliasAssigned).length,
        overdue: state.employees.filter(e => e.consultantReliasAssigned && !e.consultantReliasCompleted && 
          new Date(e.consultantReliasAssigned.getTime() + 90 * 24 * 60 * 60 * 1000) < new Date()).length,
        completionRate: Math.round((state.employees.filter(e => e.consultantAwarded).length / Math.max(state.employees.filter(e => e.level3Awarded).length, 1)) * 100)
      },
      "coach": {
        total: state.employees.filter(e => e.consultantAwarded).length,
        completed: state.employees.filter(e => e.coachAwarded).length,
        inProgress: state.employees.filter(e => e.coachReliasAssigned && !e.coachReliasCompleted).length,
        pending: state.employees.filter(e => e.consultantAwarded && !e.coachReliasAssigned).length,
        overdue: state.employees.filter(e => e.coachReliasAssigned && !e.coachReliasCompleted && 
          new Date(e.coachReliasAssigned.getTime() + 120 * 24 * 60 * 60 * 1000) < new Date()).length,
        completionRate: Math.round((state.employees.filter(e => e.coachAwarded).length / Math.max(state.employees.filter(e => e.consultantAwarded).length, 1)) * 100)
      }
    };
    return stats;
  }, [state.employees]);

  const getEmployeesForLevel = (level: string) => {
    switch (level) {
      case "care-partner":
        return state.employees;
      case "associate":
        return state.employees.filter(e => e.level1Awarded);
      case "champion":
        return state.employees.filter(e => e.level2Awarded);
      case "consultant":
        return state.employees.filter(e => e.level3Awarded);
      case "coach":
        return state.employees.filter(e => e.consultantAwarded);
      default:
        return [];
    }
  };

  const getLevelRequirements = (level: string) => {
    switch (level) {
      case "care-partner":
        return [
          { name: "Relias Training Assigned", key: "level1ReliasAssigned" },
          { name: "Relias Training Completed", key: "level1ReliasCompleted" },
          { name: "Conference Completed", key: "level1ConferenceCompleted" },
          { name: "Level 1 Awarded", key: "level1Awarded" }
        ];
      case "associate":
        return [
          { name: "Relias Training Assigned", key: "level2ReliasAssigned" },
          { name: "Relias Training Completed", key: "level2ReliasCompleted" },
          { name: "Conference Completed", key: "level2ConferenceCompleted" },
          { name: "Standing Video", key: "level2StandingVideo" },
          { name: "Sleeping/Sitting Video", key: "level2SleepingSittingVideo" },
          { name: "Feeding Video", key: "level2FeedingVideo" },
          { name: "Level 2 Awarded", key: "level2Awarded" }
        ];
      case "champion":
        return [
          { name: "Relias Training Assigned", key: "level3ReliasAssigned" },
          { name: "Relias Training Completed", key: "level3ReliasCompleted" },
          { name: "Conference Completed", key: "level3ConferenceCompleted" },
          { name: "Sitting/ Standing/ Approaching", key: "level3SittingStandingApproaching" },
          { name: "No Hand/No Speak", key: "level3NoHandNoSpeak" },
          { name: "Challenge Sleeping", key: "level3ChallengeSleeping" },
          { name: "Level 3 Awarded", key: "level3Awarded" }
        ];
      case "consultant":
        return [
          { name: "Relias Training Assigned", key: "consultantReliasAssigned" },
          { name: "Relias Training Completed", key: "consultantReliasCompleted" },
          { name: "Conference Completed", key: "consultantConferenceCompleted" },
          { name: "Coaching Session 1", key: "consultantCoachingSession1" },
          { name: "Coaching Session 2", key: "consultantCoachingSession2" },
          { name: "Coaching Session 3", key: "consultantCoachingSession3" },
          { name: "Consultant Awarded", key: "consultantAwarded" }
        ];
      case "coach":
        return [
          { name: "Relias Training Assigned", key: "coachReliasAssigned" },
          { name: "Relias Training Completed", key: "coachReliasCompleted" },
          { name: "Conference Completed", key: "coachConferenceCompleted" },
          { name: "Coaching Session 1", key: "coachCoachingSession1" },
          { name: "Coaching Session 2", key: "coachCoachingSession2" },
          { name: "Coaching Session 3", key: "coachCoachingSession3" },
          { name: "Coach Awarded", key: "coachAwarded" }
        ];
      default:
        return [];
    }
  };

  const getStatusBadge = (employee: any, requirement: any) => {
    const value = employee[requirement.key];
    if (requirement.key.includes("Awarded")) {
      const awardDateKey = requirement.key.replace("Awarded", "AwardedDate");
      const awardDate = employee[awardDateKey];
      
      return value ? (
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm">
            <CheckCircle className="w-3 h-3" />
            Awarded
          </div>
          {awardDate && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-2 py-1">
              <span className="text-xs text-green-700 font-medium">
                {awardDate.toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-xs font-semibold">
          <Clock className="w-3 h-3" />
          Pending
        </div>
      );
    }
    
         if (value) {
       return (
         <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm">
           <CheckCircle className="w-3 h-3" />
           <span className="text-xs font-medium">
             {value.toLocaleDateString()}
           </span>
         </div>
       );
     }
    
    return (
      <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-xs font-semibold">
        <Clock className="w-3 h-3" />
        Pending
      </div>
    );
  };

  const levelConfig = {
    "care-partner": { title: "Level 1", icon: Users, color: "text-blue-600" },
    "associate": { title: "Level 2", icon: Award, color: "text-green-600" },
    "champion": { title: "Level 3", icon: Star, color: "text-purple-600" },
    "consultant": { title: "Consultant", icon: GraduationCap, color: "text-orange-600" },
    "coach": { title: "Coach", icon: TrendingUp, color: "text-teal-600" }
  };

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Training Progress
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              Track employee progress through certification levels with detailed analytics
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">{state.employees.length}</div>
              <div className="text-sm text-muted-foreground">Total Employees</div>
            </div>
            <div className="w-px h-12 bg-gray-200"></div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {state.employees.filter(e => e.level1Awarded || e.level2Awarded || e.level3Awarded || e.consultantAwarded || e.coachAwarded).length}
              </div>
              <div className="text-sm text-muted-foreground">Certified</div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-2 shadow-sm">
          <TabsList className="grid w-full grid-cols-5 h-16">
            <TabsTrigger value="care-partner" className="flex items-center gap-3 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200">
              <div className="p-2 rounded-lg bg-blue-100 data-[state=active]:bg-blue-200">
                <Users className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Level 1</div>
                <div className="text-xs text-muted-foreground">Foundation</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="associate" className="flex items-center gap-3 data-[state=active]:bg-green-50 data-[state=active]:text-green-700 data-[state=active]:border-green-200">
              <div className="p-2 rounded-lg bg-green-100 data-[state=active]:bg-green-200">
                <Award className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Level 2</div>
                <div className="text-xs text-muted-foreground">Advanced</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="champion" className="flex items-center gap-3 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700 data-[state=active]:border-purple-200">
              <div className="p-2 rounded-lg bg-purple-100 data-[state=active]:bg-purple-200">
                <Star className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Level 3</div>
                <div className="text-xs text-muted-foreground">Expert</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="consultant" className="flex items-center gap-3 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700 data-[state=active]:border-orange-200">
              <div className="p-2 rounded-lg bg-orange-100 data-[state=active]:bg-orange-200">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Consultant</div>
                <div className="text-xs text-muted-foreground">Mentor</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="coach" className="flex items-center gap-3 data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 data-[state=active]:border-teal-200">
              <div className="p-2 rounded-lg bg-teal-100 data-[state=active]:bg-teal-200">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Coach</div>
                <div className="text-xs text-muted-foreground">Leader</div>
              </div>
            </TabsTrigger>
          </TabsList>
        </div>

        {Object.entries(levelConfig).map(([level, config]) => (
          <TabsContent key={level} value={level} className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Enhanced Level Header */}
              <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${config.color.replace('text-', 'bg-').replace('-600', '-100')}`}>
                      <config.icon className={`w-8 h-8 ${config.color}`} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold">{config.title} Level</h2>
                      <p className="text-muted-foreground text-lg">
                        {levelStats[level]?.total} eligible employees • {levelStats[level]?.completionRate}% completion rate
                      </p>
                    </div>
                  </div>
                  <TrainingAssignmentWizard 
                    employees={state.employees} 
                    onAssign={handleTrainingAssignment}
                  >
                    <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                      <PlayCircle className="w-5 h-5 mr-2" />
                      Assign Training
                    </Button>
                  </TrainingAssignmentWizard>
                </div>
              </div>

              {/* Enhanced Statistics Cards */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
                <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-blue-700">Total Eligible</CardTitle>
                    <div className="p-2 rounded-lg bg-blue-200">
                      <Users className="h-5 w-5 text-blue-700" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-700">{levelStats[level]?.total}</div>
                    <p className="text-xs text-blue-600 mt-1">Employees</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-green-700">Completed</CardTitle>
                    <div className="p-2 rounded-lg bg-green-200">
                      <CheckCircle className="h-5 w-5 text-green-700" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-700">{levelStats[level]?.completed}</div>
                    <p className="text-xs text-green-600 mt-1">Certified</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-yellow-700">In Progress</CardTitle>
                    <div className="p-2 rounded-lg bg-yellow-200">
                      <Clock className="h-5 w-5 text-yellow-700" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-yellow-700">{levelStats[level]?.inProgress}</div>
                    <p className="text-xs text-yellow-600 mt-1">Active</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-gray-50 to-gray-100">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-700">Pending</CardTitle>
                    <div className="p-2 rounded-lg bg-gray-200">
                      <FileText className="h-5 w-5 text-gray-700" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-700">{levelStats[level]?.pending}</div>
                    <p className="text-xs text-gray-600 mt-1">Awaiting</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-red-700">Overdue</CardTitle>
                    <div className="p-2 rounded-lg bg-red-200">
                      <AlertCircle className="h-5 w-5 text-red-700" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-red-700">{levelStats[level]?.overdue}</div>
                    <p className="text-xs text-red-600 mt-1">Delayed</p>
                  </CardContent>
                </Card>
              </div>

              {/* Enhanced Progress Overview */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    Completion Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold">Overall Completion Rate</span>
                      <span className="text-2xl font-bold text-blue-600">{levelStats[level]?.completionRate}%</span>
                    </div>
                    <div className="space-y-2">
                      <Progress value={levelStats[level]?.completionRate} className="h-4" />
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>0%</span>
                        <span>100%</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{levelStats[level]?.completed}</div>
                        <div className="text-sm text-muted-foreground">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{levelStats[level]?.inProgress}</div>
                        <div className="text-sm text-muted-foreground">In Progress</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-600">{levelStats[level]?.pending}</div>
                        <div className="text-sm text-muted-foreground">Pending</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

                             {/* Enhanced Employee Progress Table */}
               <Card className="border-0 shadow-lg">
                                   <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      Level Progress Overview
                    </CardTitle>
                  </CardHeader>
                 <CardContent className="p-0">
                   <div className="overflow-hidden rounded-b-lg">
                     <Table>
                                               <TableHeader>
                          <TableRow className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                            <TableHead className="font-bold text-blue-900 py-4 px-6 w-[15%]">Employee</TableHead>
                            <TableHead className="font-bold text-blue-900 py-4 px-6 w-[12%]">Facility</TableHead>
                            <TableHead className="font-bold text-blue-900 py-4 px-6 w-[12%]">Area</TableHead>
                            {getLevelRequirements(level).map((req) => (
                              <TableHead key={req.key} className="font-bold text-blue-900 py-4 px-6 w-[10%]">{req.name}</TableHead>
                            ))}
                            <TableHead className="font-bold text-blue-900 py-4 px-6 w-[15%]">Overall Progress</TableHead>
                          </TableRow>
                        </TableHeader>
                       <TableBody>
                         {getEmployeesForLevel(level).map((employee, index) => {
                           const completedRequirements = getLevelRequirements(level).filter(req => 
                             req.key.includes("Awarded") ? employee[req.key] : employee[req.key]
                           ).length;
                           const totalRequirements = getLevelRequirements(level).length;
                           const progressPercentage = Math.round((completedRequirements / totalRequirements) * 100);
                           
                           return (
                             <TableRow key={employee.employeeId} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-blue-50/60 transition-all duration-200 border-b border-gray-100`}>
                                                               <TableCell className="py-4 px-6">
                                  <div className="text-left">
                                    <div className="font-semibold text-gray-900">{employee.name}</div>
                                    <div className="text-sm text-gray-500">{employee.employeeId}</div>
                                  </div>
                                </TableCell>
                               <TableCell className="py-4 px-6">
                                 <div className="bg-gray-100 rounded-lg px-3 py-1 inline-block">
                                   <span className="text-sm font-medium text-gray-700">{employee.facility}</span>
                                 </div>
                               </TableCell>
                               <TableCell className="py-4 px-6">
                                 <div className="bg-blue-100 rounded-lg px-3 py-1 inline-block">
                                   <span className="text-sm font-medium text-blue-700">{employee.area}</span>
                                 </div>
                               </TableCell>
                               {getLevelRequirements(level).map((req) => (
                                 <TableCell key={req.key} className="py-4 px-6">
                                   {getStatusBadge(employee, req)}
                                 </TableCell>
                               ))}
                               <TableCell className="py-4 px-6">
                                 <div className="flex items-center gap-3">
                                   <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                                     <div 
                                       className={`h-full rounded-full transition-all duration-300 ${
                                         progressPercentage >= 80 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                         progressPercentage >= 60 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                                         progressPercentage >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                         progressPercentage >= 20 ? 'bg-gradient-to-r from-orange-500 to-red-500' :
                                         'bg-gradient-to-r from-gray-400 to-gray-500'
                                       }`}
                                       style={{ width: `${progressPercentage}%` }}
                                     />
                                   </div>
                                   <span className={`text-sm font-bold min-w-[3rem] ${
                                     progressPercentage >= 80 ? 'text-green-600' :
                                     progressPercentage >= 60 ? 'text-blue-600' :
                                     progressPercentage >= 40 ? 'text-yellow-600' :
                                     progressPercentage >= 20 ? 'text-orange-600' :
                                     'text-gray-600'
                                   }`}>
                                     {progressPercentage}%
                                   </span>
                                 </div>
                               </TableCell>
                             </TableRow>
                           );
                         })}
                       </TableBody>
                     </Table>
                   </div>
                 </CardContent>
               </Card>
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
