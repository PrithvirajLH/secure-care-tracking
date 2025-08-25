import React, { useMemo, useState, useEffect } from "react";
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

  // Dispatch level change event to update header
  useEffect(() => {
    const event = new CustomEvent('levelChange', { detail: { level: activeTab } });
    window.dispatchEvent(event);
  }, [activeTab]);

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
         <div className="flex flex-col gap-1">
           <div className="inline-flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-sm">
             <CheckCircle className="w-2 h-2" />
             <span className="text-xs">Awarded</span>
           </div>
           {awardDate && (
             <div className="bg-green-50 border border-green-200 rounded px-1 py-0.5">
               <span className="text-xs text-green-700 font-medium">
                 {awardDate.toLocaleDateString()}
               </span>
             </div>
           )}
         </div>
       ) : (
         <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-semibold">
           <Clock className="w-2 h-2" />
           <span className="text-xs">Pending</span>
         </div>
       );
     }
     
     if (value) {
       return (
         <div className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-sm">
           <CheckCircle className="w-2 h-2" />
           <span className="text-xs font-medium">
             {value.toLocaleDateString()}
           </span>
         </div>
       );
     }
     
     return (
       <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-semibold">
         <Clock className="w-2 h-2" />
         <span className="text-xs">Pending</span>
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
    <div className="h-screen flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">

        {/* Fixed Tab Container */}
        <div className="bg-white rounded-xl border border-gray-200 p-2 shadow-sm mb-0">
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

        {/* Fixed Header Container */}
        {activeTab && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 bg-white shadow-sm">
            <table className="w-full">
              <thead>
                <tr>
                                     <th className="font-bold text-blue-900 py-3 px-3 text-left w-[8%] text-sm">Employee</th>
                   <th className="font-bold text-blue-900 py-3 px-3 text-left w-[6%] text-sm">Facility</th>
                   <th className="font-bold text-blue-900 py-3 px-3 text-left w-[6%] text-sm">Area</th>
                  {getLevelRequirements(activeTab).map((req) => (
                    <th key={req.key} className="font-bold text-blue-900 py-3 px-2 text-left w-[10%] text-sm">{req.name}</th>
                  ))}
                  <th className="font-bold text-blue-900 py-3 px-3 text-left w-[10%] text-sm">Progress</th>
                </tr>
              </thead>
            </table>
          </div>
        )}

        {/* Scrollable Table Data Container */}
        <div className="flex-1 overflow-auto">
          {Object.entries(levelConfig).map(([level, config]) => (
            <TabsContent key={level} value={level} className="h-full" style={{ display: activeTab === level ? 'block' : 'none' }}>
              <Card className="border-0 shadow-lg h-full">
                <CardContent className="p-0 h-full">
                  <Table className="w-full">
                    <TableHeader className="hidden">
                      <TableRow className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                       <TableHead className="font-bold text-blue-900 py-4 px-6 w-[15%] bg-gradient-to-r from-blue-50 to-indigo-50">Employee</TableHead>
                       <TableHead className="font-bold text-blue-900 py-4 px-6 w-[12%] bg-gradient-to-r from-blue-50 to-indigo-50">Facility</TableHead>
                       <TableHead className="font-bold text-blue-900 py-4 px-6 w-[12%] bg-gradient-to-r from-blue-50 to-indigo-50">Area</TableHead>
                       {getLevelRequirements(level).map((req) => (
                         <TableHead key={req.key} className="font-bold text-blue-900 py-4 px-6 w-[10%] bg-gradient-to-r from-blue-50 to-indigo-50">{req.name}</TableHead>
                       ))}
                       <TableHead className="font-bold text-blue-900 py-4 px-6 w-[15%] bg-gradient-to-r from-blue-50 to-indigo-50">Overall Progress</TableHead>
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
                          <TableCell className="py-3 px-3 w-[8%]">
                            <div className="text-left">
                              <div className="font-semibold text-gray-900 text-sm">{employee.name}</div>
                              <div className="text-xs text-gray-500">{employee.employeeId}</div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-3 w-[6%]">
                            <div className="bg-gray-100 rounded-lg px-2 py-1 inline-block">
                              <span className="text-xs font-medium text-gray-700">{employee.facility}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-3 w-[6%]">
                            <div className="bg-blue-100 rounded-lg px-2 py-1 inline-block">
                              <span className="text-xs font-medium text-blue-700">{employee.area}</span>
                            </div>
                          </TableCell>
                          {getLevelRequirements(level).map((req) => (
                            <TableCell key={req.key} className="py-3 px-2 w-[10%]">
                              {getStatusBadge(employee, req)}
                            </TableCell>
                          ))}
                          <TableCell className="py-3 px-3 w-[10%]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
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
                              <span className={`text-xs font-bold min-w-[2rem] ${
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
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </div>
    </Tabs>
  </div>
);
}
