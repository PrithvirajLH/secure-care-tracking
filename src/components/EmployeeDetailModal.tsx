import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  PlayCircle,
  FileText,
  Video,
  Award,
  User,
  Building,
  MapPin,
  GraduationCap,
  Star,
  TrendingUp,
  Users
} from "lucide-react";
import { Employee } from "@/context/AppContext";
import { format } from "date-fns";

interface EmployeeDetailModalProps {
  employee: Employee;
  children: React.ReactNode;
  onModalOpenChange?: (isOpen: boolean) => void;
}

export default function EmployeeDetailModal({ employee, children, onModalOpenChange }: EmployeeDetailModalProps) {
  const [open, setOpen] = useState(false);

  // Notify parent component when modal opens/closes
  useEffect(() => {
    if (onModalOpenChange) {
      onModalOpenChange(open);
    }
  }, [open, onModalOpenChange]);
  const [scheduledDates, setScheduledDates] = useState<{[key: string]: Date}>({});
  const [completedDates, setCompletedDates] = useState<{[key: string]: Date}>({});
  const [inlineDatePicker, setInlineDatePicker] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState("care-partner");
  const [isCompleting, setIsCompleting] = useState(false);
  const [isAwarding, setIsAwarding] = useState(false);

  const getLevelProgress = (level: string) => {
    switch (level) {
      case "care-partner":
        return {
          requirements: [
            { name: "Relias Training Assigned", key: "level1ReliasAssigned", completed: !!employee.level1ReliasAssigned, date: employee.level1ReliasAssigned },
            { name: "Relias Training Completed", key: "level1ReliasCompleted", completed: !!employee.level1ReliasCompleted, date: employee.level1ReliasCompleted },
            { name: "Conference Completed", key: "level1ConferenceCompleted", completed: !!employee.level1ConferenceCompleted, date: employee.level1ConferenceCompleted },
            { name: "Level 1 Awarded", key: "level1Awarded", completed: employee.level1Awarded, date: employee.level1AwardedDate }
          ],
          total: 4,
          completed: [!!employee.level1ReliasAssigned, !!employee.level1ReliasCompleted, !!employee.level1ConferenceCompleted, employee.level1Awarded].filter(Boolean).length,
          color: "text-blue-600",
          icon: Users
        };
      case "associate":
        return {
          requirements: [
            { name: "Conference Completed", key: "level2ConferenceCompleted", completed: !!employee.level2ConferenceCompleted, date: employee.level2ConferenceCompleted },
            { name: "Standing Video", key: "level2StandingVideo", completed: !!employee.level2StandingVideo, date: employee.level2StandingVideo },
            { name: "Sleeping/Sitting Video", key: "level2SleepingSittingVideo", completed: !!employee.level2SleepingSittingVideo, date: employee.level2SleepingSittingVideo },
            { name: "Feeding Video", key: "level2FeedingVideo", completed: !!employee.level2FeedingVideo, date: employee.level2FeedingVideo },
            { name: "Level 2 Awarded", key: "level2Awarded", completed: employee.level2Awarded, date: employee.level2AwardedDate }
          ],
          total: 5,
          completed: [!!employee.level2ConferenceCompleted, 
                     !!employee.level2StandingVideo, !!employee.level2SleepingSittingVideo, !!employee.level2FeedingVideo, employee.level2Awarded].filter(Boolean).length,
          color: "text-green-600",
          icon: Award
        };
      case "champion":
        return {
          requirements: [
            { name: "Conference Completed", key: "level3ConferenceCompleted", completed: !!employee.level3ConferenceCompleted, date: employee.level3ConferenceCompleted },
            { name: "Sitting/Standing/Approaching", key: "level3SittingStandingApproaching", completed: !!employee.level3SittingStandingApproaching, date: employee.level3SittingStandingApproaching },
            { name: "No Hand/No Speak", key: "level3NoHandNoSpeak", completed: !!employee.level3NoHandNoSpeak, date: employee.level3NoHandNoSpeak },
            { name: "Challenge Sleeping", key: "level3ChallengeSleeping", completed: !!employee.level3ChallengeSleeping, date: employee.level3ChallengeSleeping },
            { name: "Level 3 Awarded", key: "level3Awarded", completed: employee.level3Awarded, date: employee.level3AwardedDate }
          ],
          total: 5,
          completed: [!!employee.level3ConferenceCompleted,
                     !!employee.level3SittingStandingApproaching, !!employee.level3NoHandNoSpeak, !!employee.level3ChallengeSleeping, employee.level3Awarded].filter(Boolean).length,
          color: "text-purple-600",
          icon: Star
        };
      case "consultant":
        return {
          requirements: [
            { name: "Conference Completed", key: "consultantConferenceCompleted", completed: !!employee.consultantConferenceCompleted, date: employee.consultantConferenceCompleted },
            { name: "Coaching Session 1", key: "consultantCoachingSession1", completed: !!employee.consultantCoachingSession1, date: employee.consultantCoachingSession1 },
            { name: "Coaching Session 2", key: "consultantCoachingSession2", completed: !!employee.consultantCoachingSession2, date: employee.consultantCoachingSession2 },
            { name: "Coaching Session 3", key: "consultantCoachingSession3", completed: !!employee.consultantCoachingSession3, date: employee.consultantCoachingSession3 },
            { name: "Consultant Awarded", key: "consultantAwarded", completed: employee.consultantAwarded, date: employee.consultantAwardedDate }
          ],
          total: 5,
          completed: [!!employee.consultantConferenceCompleted,
                     !!employee.consultantCoachingSession1, !!employee.consultantCoachingSession2, !!employee.consultantCoachingSession3, employee.consultantAwarded].filter(Boolean).length,
          color: "text-orange-600",
          icon: GraduationCap
        };
      case "coach":
        return {
          requirements: [
            { name: "Conference Completed", key: "coachConferenceCompleted", completed: !!employee.coachConferenceCompleted, date: employee.coachConferenceCompleted },
            { name: "Coaching Session 1", key: "coachCoachingSession1", completed: !!employee.coachCoachingSession1, date: employee.coachCoachingSession1 },
            { name: "Coaching Session 2", key: "coachCoachingSession2", completed: !!employee.coachCoachingSession2, date: employee.coachCoachingSession2 },
            { name: "Coaching Session 3", key: "coachCoachingSession3", completed: !!employee.coachCoachingSession3, date: employee.coachCoachingSession3 },
            { name: "Coach Awarded", key: "coachAwarded", completed: employee.coachAwarded, date: employee.coachAwardedDate }
          ],
          total: 5,
          completed: [!!employee.coachConferenceCompleted,
                     !!employee.coachCoachingSession1, !!employee.coachCoachingSession2, !!employee.coachCoachingSession3, employee.coachAwarded].filter(Boolean).length,
          color: "text-teal-600",
          icon: TrendingUp
        };
      default:
        return { requirements: [], total: 0, completed: 0, color: "", icon: Users };
    }
  };

  const levels = useMemo(() => [
    { key: "care-partner", name: "Level 1", progress: getLevelProgress("care-partner") },
    { key: "associate", name: "Level 2", progress: getLevelProgress("associate") },
    { key: "champion", name: "Level 3", progress: getLevelProgress("champion") },
    { key: "consultant", name: "Consultant", progress: getLevelProgress("consultant") },
    { key: "coach", name: "Coach", progress: getLevelProgress("coach") }
  ], [employee]);

  // Utility function to check if all previous requirements are completed
  const canAwardLevel = (levelKey: string, requirementKey: string): { canAward: boolean; missingRequirements: string[] } => {
    const levelProgress = getLevelProgress(levelKey);
    const currentReqIndex = levelProgress.requirements.findIndex(req => req.key === requirementKey);
    
    if (currentReqIndex === -1 || !requirementKey.includes('Awarded')) {
      return { canAward: false, missingRequirements: [] };
    }

    const missingRequirements: string[] = [];
    
    // Check all requirements before the current one
    for (let i = 0; i < currentReqIndex; i++) {
      const req = levelProgress.requirements[i];
      if (!req.completed) {
        missingRequirements.push(req.name);
      }
    }

    return {
      canAward: missingRequirements.length === 0,
      missingRequirements
    };
  };

  // Determine current level when modal opens
  useEffect(() => {
    if (open) {
      // Find the first level that's not fully completed
      for (const level of levels) {
        if (level.progress.completed < level.progress.total) {
          setCurrentLevel(level.key);
          break;
        }
      }
    }
  }, [open]);

  // Scheduling functions
  const handleScheduleDate = async (employeeId: string, requirementKey: string, date: Date | undefined) => {
    const key = `${employeeId}-${requirementKey}`;
    if (date) {
      setScheduledDates(prev => ({ ...prev, [key]: date }));
      toast.success('Training scheduled successfully!', {
        description: `Scheduled for ${date.toLocaleDateString()}`,
      });
    }
    setInlineDatePicker(null);
  };

  const handleMarkComplete = async (employeeId: string, requirementKey: string) => {
    const key = `${employeeId}-${requirementKey}`;
    const scheduledDate = scheduledDates[key];
    
    if (scheduledDate) {
      setIsCompleting(true);
      try {
        setScheduledDates(prev => {
          const newDates = { ...prev };
          delete newDates[key];
          return newDates;
        });
        
        setCompletedDates(prev => ({
          ...prev,
          [key]: scheduledDate
        }));
        
        toast.success('Training marked as complete!', {
          description: `Completed on ${scheduledDate.toLocaleDateString()}`,
        });
      } catch (error) {
        toast.error('Failed to mark training as complete');
      } finally {
        setIsCompleting(false);
      }
    }
  };

  const handleMarkAwarded = async (employeeId: string, requirementKey: string) => {
    const key = `${employeeId}-${requirementKey}`;
    const currentDate = new Date();
    
    setIsAwarding(true);
    try {
      setCompletedDates(prev => ({
        ...prev,
        [key]: currentDate
      }));
      
      toast.success('Level awarded successfully!', {
        description: `Awarded on ${currentDate.toLocaleDateString()}`,
      });
    } catch (error) {
      toast.error('Failed to award level');
    } finally {
      setIsAwarding(false);
    }
  };

  const handleReschedule = async (employeeId: string, requirementKey: string, date: Date | undefined) => {
    const key = `${employeeId}-${requirementKey}`;
    if (date) {
      setScheduledDates(prev => ({ ...prev, [key]: date }));
      toast.success('Training rescheduled successfully!', {
        description: `Rescheduled for ${date.toLocaleDateString()}`,
      });
    }
  };

  const openInlineDatePicker = (key: string) => {
    setInlineDatePicker(key);
  };

  const closeInlineDatePicker = () => {
    setInlineDatePicker(null);
  };

  // Click outside handler for inline date picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (inlineDatePicker && 
          !target.closest('.inline-date-picker') && 
          !target.closest('[data-radix-popper-content-wrapper]')) {
        closeInlineDatePicker();
      }
    };

    if (inlineDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [inlineDatePicker]);

  // Get status badge for requirements
  const getStatusBadge = (requirement: any) => {
    const value = employee[requirement.key];
    const key = `${employee.employeeId}-${requirement.key}`;
    const scheduledDate = scheduledDates[key];
    const completedDate = completedDates[key];
    const isInlineDatePickerOpen = inlineDatePicker === key;

    if (requirement.key.includes("Awarded")) {
      const awardDateKey = requirement.key.replace("Awarded", "AwardedDate");
      const awardDate = employee[awardDateKey];
      
      // Check for completed date first
      if (completedDate) {
        return (
          <div className="inline-flex items-center gap-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-1 rounded-full text-sm font-semibold shadow-sm">
            <Award className="w-3 h-3" />
            <span className="text-sm font-medium">
              {completedDate.toLocaleDateString()}
            </span>
          </div>
        );
      }
      
                           // Check for scheduled date
                if (scheduledDate) {
           return (
             <div className="flex flex-col gap-1 relative">
              {isInlineDatePickerOpen ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMarkAwarded(employee.employeeId, requirement.key)}
                    disabled={isAwarding}
                    className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:from-green-600 hover:to-emerald-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Award className="w-4 h-4" />
                    {isAwarding ? 'Awarding...' : 'Mark Awarded'}
                  </button>
                  <button
                    onClick={() => {
                      // Show date picker for rescheduling
                      setInlineDatePicker(`reschedule-${key}`);
                    }}
                    className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:from-yellow-600 hover:to-orange-600 transition-colors shadow-sm"
                  >
                    <Clock className="w-4 h-4" />
                    Reschedule
                  </button>
                  {inlineDatePicker && inlineDatePicker.startsWith(`reschedule-${key}`) && (
                    <div className="absolute top-full right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px]">
                      <DatePicker
                        date={scheduledDate}
                        onDateChange={(date) => handleReschedule(employee.employeeId, requirement.key, date)}
                        placeholder="Reschedule date"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => openInlineDatePicker(key)}
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
                </>
              )}
            </div>
          );
       }
      
      // Check for existing awarded value
      if (value) {
        return (
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center justify-center gap-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-1 rounded-full text-sm font-semibold shadow-sm w-20">
              <Award className="w-3 h-3" />
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
        );
      }

             // Check if can award (all previous requirements completed)
       const { canAward, missingRequirements } = canAwardLevel(currentLevel, requirement.key);
       
               if (canAward) {
          return (
            <div className="flex flex-col gap-1">
              {isInlineDatePickerOpen ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMarkAwarded(employee.employeeId, requirement.key)}
                    disabled={isAwarding}
                    className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:from-green-600 hover:to-emerald-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Award className="w-4 h-4" />
                    {isAwarding ? 'Awarding...' : 'Mark Awarded'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => openInlineDatePicker(key)}
                  disabled={isAwarding}
                  className="inline-flex items-center justify-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm font-semibold hover:bg-gray-200 cursor-pointer transition-colors w-20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Clock className="w-3 h-3" />
                  <span className="text-sm">Pending</span>
                </button>
              )}
            </div>
          );
       } else {
         return (
           <div className="flex flex-col gap-1">
             <Tooltip>
               <TooltipTrigger asChild>
                 <button
                   disabled
                   className="inline-flex items-center justify-center gap-1 bg-gray-100 text-gray-400 px-2 py-1 rounded-full text-sm font-semibold cursor-not-allowed w-20"
                 >
                   <Clock className="w-3 h-3" />
                   <span className="text-sm">Pending</span>
                 </button>
               </TooltipTrigger>
               <TooltipContent>
                 <p>Cannot be awarded until the following requirements are completed:</p>
                 <ul className="mt-1">
                   {missingRequirements.map((req, index) => (
                     <li key={index} className="text-sm">• {req}</li>
                   ))}
                 </ul>
               </TooltipContent>
             </Tooltip>
           </div>
         );
       }
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
    
         if (scheduledDate) {
       return (
         <div className="flex flex-col gap-1 relative">
                       {isInlineDatePickerOpen ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMarkComplete(employee.employeeId, requirement.key)}
                  disabled={isCompleting}
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:from-blue-600 hover:to-indigo-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  {isCompleting ? 'Completing...' : 'Mark Complete'}
                </button>
                <button
                  onClick={() => {
                    // Show date picker for rescheduling
                    setInlineDatePicker(`reschedule-${key}`);
                  }}
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:from-yellow-600 hover:to-orange-600 transition-colors shadow-sm"
                >
                  <Clock className="w-4 h-4" />
                  Reschedule
                </button>
                {inlineDatePicker && inlineDatePicker.startsWith(`reschedule-${key}`) && (
                  <div className="absolute top-full right-0 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[200px]">
                    <DatePicker
                      date={scheduledDate}
                      onDateChange={(date) => handleReschedule(employee.employeeId, requirement.key, date)}
                      placeholder="Reschedule date"
                    />
                  </div>
                )}
              </div>
            ) : (
             <>
               <button
                 onClick={() => openInlineDatePicker(key)}
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
             </>
           )}
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
         {isInlineDatePickerOpen ? (
           <div className="flex items-center gap-2">
             <DatePicker
               date={scheduledDate}
               onDateChange={(date) => handleScheduleDate(employee.employeeId, requirement.key, date)}
               placeholder="Select date"
             />
           </div>
         ) : (
           <button
             onClick={() => openInlineDatePicker(key)}
             className="inline-flex items-center justify-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm font-semibold hover:bg-gray-200 cursor-pointer transition-colors w-20"
           >
             <Clock className="w-3 h-3" />
             <span className="text-sm">Pending</span>
           </button>
         )}
       </div>
     );
  };
  
  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <User className="w-6 h-6" />
            Employee Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Employee Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{employee.name}</span>
                <Badge variant="outline">{employee.staffRoles}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{employee.facility}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{employee.area}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{employee.employeeId}</span>
              </div>
            </CardContent>
          </Card>

          {/* Training Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Training Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={currentLevel} onValueChange={setCurrentLevel} className="space-y-4">
                <div className="flex max-w-fit mx-auto border border-transparent rounded-full bg-white shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] px-6 py-3 items-center justify-center space-x-6 mb-6">
                  {levels.map((level, idx) => {
                    const isActive = currentLevel === level.key;
                    return (
                      <button
                        key={`level-${idx}`}
                        onClick={() => setCurrentLevel(level.key)}
                        className="relative items-center flex space-x-2 transition-all duration-300 group"
                      >
                        <motion.div
                          className={cn(
                            "relative p-2 rounded-lg",
                            isActive 
                              ? "bg-purple-100 shadow-sm" 
                              : "hover:bg-purple-50"
                          )}
                          initial={{ scale: 1 }}
                          animate={{ 
                            scale: isActive ? 1.05 : 1,
                            backgroundColor: isActive ? "#f3e8ff" : "rgba(0, 0, 0, 0)"
                          }}
                          whileHover={{ scale: isActive ? 1.15 : 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          transition={{ 
                            type: "spring", 
                            bounce: 0.2, 
                            duration: 0.4,
                            ease: "easeInOut"
                          }}
                        >
                          <motion.span className={cn(
                            "block sm:hidden transition-colors duration-300",
                            isActive ? "text-purple-700" : "text-neutral-900"
                          )}>
                            <level.progress.icon className="w-4 h-4" />
                          </motion.span>
                          <motion.span className={cn(
                            "hidden sm:block text-sm font-medium transition-colors duration-300",
                            isActive ? "text-purple-700" : "text-neutral-900"
                          )}>
                            {level.name}
                          </motion.span>
                          
                          {/* Active indicator */}
                          {isActive && (
                            <motion.div
                              className="absolute inset-0 bg-purple-200/30 rounded-lg"
                              layoutId="activeTab"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ 
                                type: "spring", 
                                bounce: 0.3, 
                                duration: 0.5,
                                ease: "easeInOut"
                              }}
                            />
                          )}
                          
                          {/* Hover glow effect */}
                          <motion.div
                            className="absolute inset-0 bg-purple-100/50 rounded-lg opacity-0 group-hover:opacity-100"
                            initial={{ opacity: 0 }}
                            whileHover={{ opacity: 1 }}
                            transition={{ duration: 0.2 }}
                          />
                        </motion.div>
                      </button>
                    );
                  })}
                </div>

                {levels.map((level) => (
                  <TabsContent key={level.key} value={level.key} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <level.progress.icon className={`w-6 h-6 ${level.progress.color}`} />
                        <div>
                          <h3 className="font-semibold">{level.name} Level</h3>
                          <p className="text-sm text-muted-foreground">
                            {level.progress.completed} of {level.progress.total} requirements completed
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={(level.progress.completed / level.progress.total) * 100} className="w-24" />
                        <span className="text-sm font-medium">
                          {Math.round((level.progress.completed / level.progress.total) * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {level.progress.requirements.map((req, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                          <div className="flex items-center gap-3">
                            <span className="font-medium">{req.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(req)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button>
              <PlayCircle className="w-4 h-4 mr-2" />
              Assign Training
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
}
