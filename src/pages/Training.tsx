import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-picker";
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
import { useTrainingData } from "@/hooks/useTrainingData";
import EmployeeDetailModal from "@/components/EmployeeDetailModal";

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
  
  // Training data hook for database operations
  const {
    scheduleTraining,
    completeTraining,
    rescheduleTraining,
    isScheduling,
    isCompleting,
    isRescheduling,
  } = useTrainingData();

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
          { name: "Relias Training\nAssigned", key: "level1ReliasAssigned" },
          { name: "Relias Training\nCompleted", key: "level1ReliasCompleted" },
          { name: "Conference\nCompleted", key: "level1ConferenceCompleted" },
          { name: "Level 1 Awarded", key: "level1Awarded" }
        ];
      case "associate":
        return [
          { name: "Conference\nCompleted", key: "level2ConferenceCompleted" },
          { name: "Standing\nVideo", key: "level2StandingVideo" },
          { name: "Sleeping/Sitting\nVideo", key: "level2SleepingSittingVideo" },
          { name: "Feeding\nVideo", key: "level2FeedingVideo" },
          { name: "Level 2 Awarded", key: "level2Awarded" }
        ];
      case "champion":
        return [
          { name: "Conference\nCompleted", key: "level3ConferenceCompleted" },
          { name: "Sitting/ Standing/\nApproaching", key: "level3SittingStandingApproaching" },
          { name: "No Hand/No\nSpeak", key: "level3NoHandNoSpeak" },
          { name: "Challenge\nSleeping", key: "level3ChallengeSleeping" },
          { name: "Level 3 Awarded", key: "level3Awarded" }
        ];
      case "consultant":
        return [
          { name: "Conference\nCompleted", key: "consultantConferenceCompleted" },
          { name: "Coaching Session\n1", key: "consultantCoachingSession1" },
          { name: "Coaching Session\n2", key: "consultantCoachingSession2" },
          { name: "Coaching Session\n3", key: "consultantCoachingSession3" },
          { name: "Consultant Awarded", key: "consultantAwarded" }
        ];
      case "coach":
        return [
          { name: "Conference\nCompleted", key: "coachConferenceCompleted" },
          { name: "Coaching Session\n1", key: "coachCoachingSession1" },
          { name: "Coaching Session\n2", key: "coachCoachingSession2" },
          { name: "Coaching Session\n3", key: "coachCoachingSession3" },
          { name: "Coach Awarded", key: "coachAwarded" }
        ];
      default:
        return [];
    }
  };

     const [scheduledDates, setScheduledDates] = useState<{[key: string]: Date}>({});
     const [completedDates, setCompletedDates] = useState<{[key: string]: Date}>({});
     const [openDatePicker, setOpenDatePicker] = useState<string | null>(null);

     const handleScheduleDate = async (employeeId: string, requirementKey: string, date: Date | undefined) => {
       const key = `${employeeId}-${requirementKey}`;
       if (date) {
         // Temporarily disable API calls for testing
         // try {
         //   // Call database API to schedule training
         //   await scheduleTraining({ employeeId, requirementKey, date });
         // } catch (error) {
         //   console.error('Failed to schedule training:', error);
         // }
         
         // Update local state only
         setScheduledDates(prev => ({ ...prev, [key]: date }));
         toast.success('Training scheduled successfully!', {
           description: `Scheduled for ${date.toLocaleDateString()}`,
         });
       }
       setOpenDatePicker(null);
     };

     const handleMarkComplete = async (employeeId: string, requirementKey: string) => {
       const key = `${employeeId}-${requirementKey}`;
       // Get the scheduled date before removing it
       const scheduledDate = scheduledDates[key];
       
       if (scheduledDate) {
         // Temporarily disable API calls for testing
         // try {
         //   // Call database API to complete training
         //   await completeTraining({ employeeId, requirementKey, date: scheduledDate });
         // } catch (error) {
         //   console.error('Failed to complete training:', error);
         // }
         
         // Remove from scheduled dates
         setScheduledDates(prev => {
           const newDates = { ...prev };
           delete newDates[key];
           return newDates;
         });
         
         // Add to completed dates with the scheduled date
         setCompletedDates(prev => ({
           ...prev,
           [key]: scheduledDate
         }));
         
         toast.success('Training marked as complete!', {
           description: `Completed on ${scheduledDate.toLocaleDateString()}`,
         });
       }
       
       setOpenDatePicker(null);
     };

     const openDatePickerFor = (key: string) => {
       setOpenDatePicker(key);
     };

     // Close date picker when clicking outside
     useEffect(() => {
       const handleClickOutside = (event: MouseEvent) => {
         const target = event.target as Element;
         // Check if click is outside the date picker popup
         // Don't close if clicking on the date picker button or calendar
         if (openDatePicker && 
             !target.closest('.date-picker-popup') && 
             !target.closest('[data-radix-popper-content-wrapper]') &&
             !target.closest('[role="dialog"]')) {
           setOpenDatePicker(null);
         }
       };

       if (openDatePicker) {
         document.addEventListener('mousedown', handleClickOutside);
       }

       return () => {
         document.removeEventListener('mousedown', handleClickOutside);
       };
     }, [openDatePicker]);

     const handleReschedule = async (employeeId: string, requirementKey: string, date: Date | undefined) => {
       const key = `${employeeId}-${requirementKey}`;
       if (date) {
         // Temporarily disable API calls for testing
         // try {
         //   // Call database API to reschedule training
         //   await rescheduleTraining({ employeeId, requirementKey, date });
         // } catch (error) {
         //   console.error('Failed to reschedule training:', error);
         // }
         
         // Update local state only
         setScheduledDates(prev => ({ ...prev, [key]: date }));
         toast.success('Training rescheduled successfully!', {
           description: `Rescheduled for ${date.toLocaleDateString()}`,
         });
       }
       setOpenDatePicker(null);
     };

     const getStatusBadge = (employee: any, requirement: any) => {
       const value = employee[requirement.key];
       const key = `${employee.employeeId}-${requirement.key}`;
       const scheduledDate = scheduledDates[key];
       const completedDate = completedDates[key];
       const isDatePickerOpen = openDatePicker === key;

       if (requirement.key.includes("Awarded")) {
         const awardDateKey = requirement.key.replace("Awarded", "AwardedDate");
         const awardDate = employee[awardDateKey];
         
         // Check for completed date first
         if (completedDate) {
           return (
             <div className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-2 py-1 rounded-full text-sm font-semibold shadow-sm">
               <CheckCircle className="w-3 h-3" />
               <span className="text-sm font-medium">
                 {completedDate.toLocaleDateString()}
               </span>
             </div>
           );
         }
         
         // Check for scheduled date
         if (scheduledDate) {
           return (
             <div className="flex flex-col gap-1">
               <button
                 onClick={() => openDatePickerFor(key)}
                 className="inline-flex items-center justify-center gap-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-1 rounded-full text-sm font-semibold shadow-sm hover:from-yellow-600 hover:to-orange-600 cursor-pointer transition-colors w-20"
               >
                 <Clock className="w-3 h-3" />
                 <span className="text-sm">Scheduled</span>
               </button>
               <div className="inline-flex items-center justify-center gap-1 bg-yellow-50 border border-yellow-200 rounded px-2 py-1 w-20">
                 <span className="text-sm text-yellow-700 font-medium">
                   {scheduledDate.toLocaleDateString()}
                 </span>
               </div>
               {isDatePickerOpen && (
                 <div className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-2 mt-1 w-48 date-picker-popup">
                   <div className="flex flex-col gap-2 mb-3">
                     <button
                       onClick={() => handleMarkComplete(employee.employeeId, requirement.key)}
                       disabled={isCompleting}
                       className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:from-green-600 hover:to-emerald-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       <CheckCircle className="w-4 h-4" />
                       {isCompleting ? 'Completing...' : 'Mark Complete'}
                     </button>
                     <button
                       onClick={() => {
                         // Keep date picker open for rescheduling
                       }}
                       disabled={isRescheduling}
                       className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:from-blue-600 hover:to-indigo-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       <Clock className="w-4 h-4" />
                       {isRescheduling ? 'Rescheduling...' : 'Reschedule'}
                     </button>
                   </div>
                   <DatePicker
                     date={scheduledDate}
                     onDateChange={(date) => handleReschedule(employee.employeeId, requirement.key, date)}
                     placeholder="Reschedule date"
                   />
                 </div>
               )}
             </div>
           );
         }
         
         // Check for existing awarded value
         return value ? (
           <div className="flex flex-col gap-1">
             <div className="inline-flex items-center justify-center gap-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-1 rounded-full text-sm font-semibold shadow-sm w-20">
               <CheckCircle className="w-3 h-3" />
               <span className="text-sm">Awarded</span>
             </div>
             {awardDate && (
               <div className="inline-flex items-center justify-center gap-1 bg-green-50 border border-green-200 rounded px-2 py-1 w-20">
                 <span className="text-sm text-green-700 font-medium">
                   {awardDate.toLocaleDateString()}
                 </span>
               </div>
             )}
           </div>
         ) : (
           <div className="flex flex-col gap-1">
             <button
               onClick={() => openDatePickerFor(key)}
               disabled={isScheduling}
               className="inline-flex items-center justify-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm font-semibold hover:bg-gray-200 cursor-pointer transition-colors w-20 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <Clock className="w-3 h-3" />
               <span className="text-sm">{isScheduling ? 'Scheduling...' : 'Pending'}</span>
             </button>
             {isDatePickerOpen && (
               <div className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-2 mt-1 w-48 date-picker-popup">
                 <DatePicker
                   date={scheduledDate}
                   onDateChange={(date) => handleScheduleDate(employee.employeeId, requirement.key, date)}
                   placeholder="Schedule date"
                 />
               </div>
             )}
           </div>
         );
       }
       
       if (scheduledDate) {
         return (
           <div className="flex flex-col gap-1">
             <button
               onClick={() => openDatePickerFor(key)}
               className="inline-flex items-center justify-center gap-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-2 py-1 rounded-full text-sm font-semibold shadow-sm hover:from-yellow-600 hover:to-orange-600 cursor-pointer transition-colors w-20"
             >
               <Clock className="w-3 h-3" />
               <span className="text-sm">Scheduled</span>
             </button>
             <div className="inline-flex items-center justify-center gap-1 bg-yellow-50 border border-yellow-200 rounded px-2 py-1 w-20">
               <span className="text-sm text-yellow-700 font-medium">
                 {scheduledDate.toLocaleDateString()}
               </span>
             </div>
             {isDatePickerOpen && (
               <div className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-2 mt-1 w-48 date-picker-popup">
                 <div className="flex flex-col gap-2 mb-3">
                   <button
                     onClick={() => handleMarkComplete(employee.employeeId, requirement.key)}
                     disabled={isCompleting}
                     className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:from-green-600 hover:to-emerald-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     <CheckCircle className="w-4 h-4" />
                     {isCompleting ? 'Completing...' : 'Mark Complete'}
                   </button>
                   <button
                     onClick={() => {
                       // Keep date picker open for rescheduling
                     }}
                     disabled={isRescheduling}
                     className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:from-blue-600 hover:to-indigo-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                     <Clock className="w-4 h-4" />
                     {isRescheduling ? 'Rescheduling...' : 'Reschedule'}
                   </button>
                 </div>
                 <DatePicker
                   date={scheduledDate}
                   onDateChange={(date) => handleReschedule(employee.employeeId, requirement.key, date)}
                   placeholder="Reschedule date"
                 />
               </div>
             )}
           </div>
         );
       }
       
       if (completedDate) {
         return (
           <div className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-2 py-1 rounded-full text-sm font-semibold shadow-sm">
             <CheckCircle className="w-3 h-3" />
             <span className="text-sm font-medium">
               {completedDate.toLocaleDateString()}
             </span>
           </div>
         );
       }
       
       if (value) {
         return (
           <div className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-2 py-1 rounded-full text-sm font-semibold shadow-sm">
             <CheckCircle className="w-3 h-3" />
             <span className="text-sm font-medium">
               {value.toLocaleDateString()}
             </span>
           </div>
         );
       }
       
       return (
         <div className="flex flex-col gap-1">
                        <button
               onClick={() => openDatePickerFor(key)}
               disabled={isScheduling}
               className="inline-flex items-center justify-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm font-semibold hover:bg-gray-200 cursor-pointer transition-colors w-20 disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <Clock className="w-3 h-3" />
               <span className="text-sm">{isScheduling ? 'Scheduling...' : 'Pending'}</span>
             </button>
                        {isDatePickerOpen && (
               <div className="absolute z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-2 mt-1 w-48 date-picker-popup">
                 <DatePicker
                   date={scheduledDate}
                   onDateChange={(date) => handleScheduleDate(employee.employeeId, requirement.key, date)}
                   placeholder="Schedule date"
                 />
               </div>
             )}
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
            <TabsTrigger value="care-partner" className="flex items-center gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800 data-[state=active]:border-blue-300 data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all duration-200 px-2">
              <div className="p-1.5 rounded-lg bg-blue-100 data-[state=active]:bg-blue-300 data-[state=active]:shadow-md">
                <Users className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-semibold data-[state=active]:font-bold text-sm">Level 1</div>
                <div className="text-xs text-muted-foreground data-[state=active]:text-blue-600">Foundation</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="associate" className="flex items-center gap-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-800 data-[state=active]:border-green-300 data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all duration-200 px-2">
              <div className="p-1.5 rounded-lg bg-green-100 data-[state=active]:bg-green-300 data-[state=active]:shadow-md">
                <Award className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-semibold data-[state=active]:font-bold text-sm">Level 2</div>
                <div className="text-xs text-muted-foreground data-[state=active]:text-green-600">Advanced</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="champion" className="flex items-center gap-2 data-[state=active]:bg-purple-100 data-[state=active]:text-purple-800 data-[state=active]:border-purple-300 data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all duration-200 px-2">
              <div className="p-1.5 rounded-lg bg-purple-100 data-[state=active]:bg-purple-300 data-[state=active]:shadow-md">
                <Star className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-semibold data-[state=active]:font-bold text-sm">Level 3</div>
                <div className="text-xs text-muted-foreground data-[state=active]:text-purple-600">Expert</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="consultant" className="flex items-center gap-2 data-[state=active]:bg-orange-100 data-[state=active]:text-orange-800 data-[state=active]:border-orange-300 data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all duration-200 px-2">
              <div className="p-1.5 rounded-lg bg-orange-100 data-[state=active]:bg-orange-300 data-[state=active]:shadow-md">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-semibold data-[state=active]:font-bold text-sm">Consultant</div>
                <div className="text-xs text-muted-foreground data-[state=active]:text-orange-600">Mentor</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="coach" className="flex items-center gap-2 data-[state=active]:bg-teal-100 data-[state=active]:text-teal-800 data-[state=active]:border-teal-300 data-[state=active]:shadow-lg data-[state=active]:scale-105 transition-all duration-200 px-2">
              <div className="p-1.5 rounded-lg bg-teal-100 data-[state=active]:bg-teal-300 data-[state=active]:shadow-md">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-semibold data-[state=active]:font-bold text-sm">Coach</div>
                <div className="text-xs text-muted-foreground data-[state=active]:text-teal-600">Leader</div>
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
                                                      <th className="font-bold text-blue-900 py-3 px-3 text-left w-[8%] text-base">Employee</th>
                 <th className="font-bold text-blue-900 py-3 px-3 text-left w-[6%] text-base">Facility</th>
                 <th className="font-bold text-blue-900 py-3 px-3 text-left w-[6%] text-base">Area</th>
                  {getLevelRequirements(activeTab).map((req) => (
                    <th key={req.key} className={`font-bold text-blue-900 py-3 px-2 text-left text-base whitespace-pre-line ${
                      req.key.includes("Awarded") ? "w-[12%]" : "w-[10%]"
                    }`}>{req.name}</th>
                  ))}
                  <th className="font-bold text-blue-900 py-3 px-3 text-left w-[10%] text-base">Progress</th>
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
                              <EmployeeDetailModal employee={employee}>
                                <div className="font-semibold text-gray-900 text-base cursor-pointer hover:text-blue-600 hover:underline transition-colors">
                                  {employee.name}
                                </div>
                              </EmployeeDetailModal>
                              <div className="text-sm text-gray-500">{employee.employeeId}</div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-3 w-[6%]">
                            <div className="bg-gray-100 rounded-lg px-2 py-1 inline-block">
                              <span className="text-sm font-medium text-gray-700">{employee.facility}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-3 w-[6%]">
                            <div className="bg-blue-100 rounded-lg px-2 py-1 inline-block">
                              <span className="text-sm font-medium text-blue-700">{employee.area}</span>
                            </div>
                          </TableCell>
                          {getLevelRequirements(level).map((req) => (
                            <TableCell key={req.key} className={`py-3 px-2 ${
                              req.key.includes("Awarded") ? "w-[12%]" : "w-[10%]"
                            }`}>
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
                              <span className={`text-sm font-bold min-w-[2rem] ${
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
