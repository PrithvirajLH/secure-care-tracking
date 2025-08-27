import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-picker";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
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
import { FloatingNav } from "@/components/ui/floating-navbar";
import { useEmployees, useEmployeeStats } from "@/hooks/useEmployees";

interface LevelStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  completionRate: number;
}

export default function Training() {
  const [activeTab, setActiveTab] = useState("care-partner");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemsPerPage] = useState(50); // Increased for better performance
  
  // Training data hook for database operations
  const {
    scheduleTraining,
    completeTraining,
    rescheduleTraining,
    isScheduling,
    isCompleting,
    isRescheduling,
  } = useTrainingData();

  // Server-side pagination with filters
  const filters = useMemo(() => ({
    level: activeTab,
    status: 'active' // Only fetch active employees
  }), [activeTab]);

  const {
    employees: currentEmployees,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    totalPages,
    totalEmployees,
    isFetching
  } = useEmployees(filters, itemsPerPage);

  // Server-side statistics
  const { data: levelStats } = useEmployeeStats(activeTab);

  // Sync active tab with URL hash and dispatch header update
  useEffect(() => {
    const event = new CustomEvent('levelChange', { detail: { level: activeTab } });
    window.dispatchEvent(event);
    // keep hash in sync for FloatingNav anchor links
    if (window.location.hash !== `#${activeTab}`) {
      window.location.hash = `#${activeTab}`;
    }
    // Reset pagination when tab changes
    setCurrentPage(1);
  }, [activeTab, setCurrentPage]);

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash?.replace('#', '') || 'care-partner';
      setActiveTab(hash as any);
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  const handleTrainingAssignment = (assignments: any[]) => {
    // In a real application, this would update the backend
    console.log("Training assignments:", assignments);
    toast.success(`Assigned training to ${assignments.length} employees`);
  };

  // Server-side statistics are now handled by useEmployeeStats hook

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

   // Loading state
   if (isLoading) {
     return (
       <div className="flex items-center justify-center h-64">
         <div className="text-center">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
           <p className="text-gray-600">Loading employees...</p>
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
      <div className="flex flex-col h-full">
        {!isModalOpen && (
          <FloatingNav
            navItems={[
              { name: "Level 1", link: "#care-partner", icon: <Users className="h-4 w-4" /> },
              { name: "Level 2", link: "#associate", icon: <Award className="h-4 w-4" /> },
              { name: "Level 3", link: "#champion", icon: <Star className="h-4 w-4" /> },
              { name: "Consultant", link: "#consultant", icon: <GraduationCap className="h-4 w-4" /> },
              { name: "Coach", link: "#coach", icon: <TrendingUp className="h-4 w-4" /> },
            ]}
            className="top-4"
            activeTab={activeTab}
          />
        )}
        
        {/* Sticky Table Header - Fixed to viewport */}
        <div className="sticky top-0 z-20 bg-gradient-to-r from-purple-50 to-lavender-50 border-b border-purple-100 shadow-sm mt-14">
          <div className="px-6">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-purple-50 to-lavender-50 border-b border-purple-100">
                  <TableHead className="font-bold text-purple-900 py-4 px-3 w-[12%] bg-gradient-to-r from-purple-50 to-lavender-50 text-base">Employee</TableHead>
                  <TableHead className="font-bold text-purple-900 py-4 px-3 w-[10%] bg-gradient-to-r from-purple-50 to-lavender-50 text-base">Facility</TableHead>
                  <TableHead className="font-bold text-purple-900 py-4 px-3 w-[10%] bg-gradient-to-r from-purple-50 to-lavender-50 text-base">Area</TableHead>
                  {getLevelRequirements(activeTab).map((req) => (
                    <TableHead key={req.key} className={`font-bold text-purple-900 py-4 px-6 bg-gradient-to-r from-purple-50 to-lavender-50 text-base whitespace-pre-line ${
                      req.key.includes("Awarded") ? "w-[12%]" : "w-[10%]"
                    }`}>{req.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
            </Table>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className={`flex-1 flex flex-col ${isModalOpen ? 'mt-0' : 'mt-0'}`}>

          {/* Table Container with Scrollable Body */}
          <div className="flex-1 flex flex-col min-h-0">
            {Object.entries(levelConfig).map(([level, config]) => (
              <TabsContent key={level} value={level} className="flex-1 flex flex-col min-h-0" style={{ display: activeTab === level ? 'flex' : 'none' }}>
                <Card className="border-0 shadow-lg flex-1 flex flex-col min-h-0">
                  <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                    {/* Scrollable Table Body */}
                    <div className="flex-1 overflow-auto min-h-0">
                      <Table>
                        <TableBody>
                          {currentEmployees.map((employee, index) => {
                            return (
                              <TableRow key={employee.employeeId} className={`${index % 2 === 0 ? 'bg-white' : 'bg-purple-50/30'} hover:bg-purple-50/60 transition-all duration-200 border-b border-purple-100`}>
                                <TableCell className="py-3 px-3 w-[12%]">
                                  <div className="text-left">
                                    <EmployeeDetailModal 
                                      employee={employee}
                                      onModalOpenChange={setIsModalOpen}
                                    >
                                      <div className="font-semibold text-purple-900 text-base cursor-pointer hover:text-purple-600 hover:underline transition-colors">
                                        {employee.name}
                                      </div>
                                    </EmployeeDetailModal>
                                    <div className="text-sm text-gray-500">{employee.employeeId}</div>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 px-3 w-[10%]">
                                  <div className="bg-purple-100 rounded-lg px-2 py-1 inline-block">
                                    <span className="text-sm font-medium text-purple-700">{employee.facility}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 px-3 w-[10%]">
                                  <div className="bg-lavender-100 rounded-lg px-2 py-1 inline-block">
                                    <span className="text-sm font-medium text-lavender-700">{employee.area}</span>
                                  </div>
                                </TableCell>
                                {getLevelRequirements(level).map((req) => (
                                  <TableCell key={req.key} className={`py-3 px-6 ${
                                    req.key.includes("Awarded") ? "w-[12%]" : "w-[10%]"
                                  }`}>
                                    {getStatusBadge(employee, req)}
                                  </TableCell>
                                ))}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                   {/* Pagination */}
                   <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-4">
                     <div className="flex items-center justify-between">
                       <div className="text-sm text-gray-600">
                         Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalEmployees)} of {totalEmployees} employees
                         {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
                         {isFetching && <span className="ml-2 text-purple-600">• Loading...</span>}
                       </div>
                         {totalPages > 1 && (
                           <Pagination>
                             <PaginationContent>
                               <PaginationItem>
                                 <PaginationPrevious 
                                   href="#"
                                   onClick={(e) => {
                                     e.preventDefault();
                                     if (currentPage > 1) setCurrentPage(currentPage - 1);
                                   }}
                                   className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                                 />
                               </PaginationItem>
                               
                               {/* Page numbers */}
                               {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                 let pageNum;
                                 if (totalPages <= 5) {
                                   pageNum = i + 1;
                                 } else if (currentPage <= 3) {
                                   pageNum = i + 1;
                                 } else if (currentPage >= totalPages - 2) {
                                   pageNum = totalPages - 4 + i;
                                 } else {
                                   pageNum = currentPage - 2 + i;
                                 }
                                 
                                 return (
                                   <PaginationItem key={pageNum}>
                                     <PaginationLink
                                       href="#"
                                       onClick={(e) => {
                                         e.preventDefault();
                                         setCurrentPage(pageNum);
                                       }}
                                       isActive={currentPage === pageNum}
                                     >
                                       {pageNum}
                                     </PaginationLink>
                                   </PaginationItem>
                                 );
                               })}
                               
                               <PaginationItem>
                                 <PaginationNext 
                                   href="#"
                                   onClick={(e) => {
                                     e.preventDefault();
                                     if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                                   }}
                                   className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                                 />
                               </PaginationItem>
                             </PaginationContent>
                           </Pagination>
                         )}
                       </div>
                     </div>
                 </CardContent>
               </Card>
             </TabsContent>
           ))}
         </div>
       </Tabs>
     </div>
   );
 }
