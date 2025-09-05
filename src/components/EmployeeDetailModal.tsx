import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { fmt, parseDate } from "@/config/awardTypes";
import { motion, AnimatePresence } from "framer-motion";
import { ShineBorder } from "@/components/magicui/shine-border";
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
  Users,
  UserCheck,
  MessageSquare,
  Save
} from "lucide-react";
import { Employee } from "@/context/AppContext";
import { format } from "date-fns";
import { useTrainingData } from "@/hooks/useTrainingData";
import { trainingAPI } from "@/services/api";

interface EmployeeDetailModalProps {
  employee: Employee;
  children: React.ReactNode;
  onModalOpenChange?: (isOpen: boolean) => void;
}

export default function EmployeeDetailModal({ employee, children, onModalOpenChange }: EmployeeDetailModalProps) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(employee.notes || "");
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>(employee.advisorId?.toString() || "");
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [isUpdatingNotes, setIsUpdatingNotes] = useState(false);
  const [isUpdatingAdvisor, setIsUpdatingAdvisor] = useState(false);

  // Notify parent component when modal opens/closes
  useEffect(() => {
    if (onModalOpenChange) {
      onModalOpenChange(open);
    }
  }, [open, onModalOpenChange]);

  // Load advisors when modal opens
  useEffect(() => {
    if (open) {
      loadAdvisors();
    }
  }, [open]);

  // Load advisors from API
  const loadAdvisors = async () => {
    try {
      const advisorList = await trainingAPI.getAdvisors();
      setAdvisors(advisorList);
    } catch (error) {
      console.error('Failed to load advisors:', error);
      toast.error('Failed to load advisors');
    }
  };

  // Handle notes update
  const handleNotesUpdate = async () => {
    if (notes === (employee.notes || "")) return; // No changes
    
    setIsUpdatingNotes(true);
    try {
      await trainingAPI.updateEmployeeNotes(employee.employeeId.toString(), notes);
      toast.success('Notes updated successfully');
    } catch (error) {
      console.error('Failed to update notes:', error);
      toast.error('Failed to update notes');
      setNotes(employee.notes || ""); // Revert on error
    } finally {
      setIsUpdatingNotes(false);
    }
  };

  // Handle advisor update
  const handleAdvisorUpdate = async (advisorId: string) => {
    const newAdvisorId = advisorId === "" ? null : parseInt(advisorId);
    if (newAdvisorId === employee.advisorId) return; // No changes
    
    setIsUpdatingAdvisor(true);
    try {
      await trainingAPI.updateEmployeeAdvisor(employee.employeeId.toString(), newAdvisorId);
      setSelectedAdvisorId(advisorId);
      toast.success('Advisor updated successfully');
    } catch (error) {
      console.error('Failed to update advisor:', error);
      toast.error('Failed to update advisor');
      setSelectedAdvisorId(employee.advisorId?.toString() || ""); // Revert on error
    } finally {
      setIsUpdatingAdvisor(false);
    }
  };
  // Use the training data hook for API operations
  const {
    scheduleTraining,
    completeTraining,
    rescheduleTraining,
    awardTraining,
    approveConference,
    rejectConference,
    isScheduling,
    isCompleting,
    isRescheduling,
    isAwarding,
    isApprovingConference,
    isRejectingConference,
  } = useTrainingData();
  
  const [inlineDatePicker, setInlineDatePicker] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState("care-partner");

  const getLevelProgress = (level: string) => {
    switch (level) {
             case "care-partner":
         return {
           requirements: [
             { name: "Relias Training Assigned", key: "assignedDate", completed: !!employee.assignedDate, date: employee.assignedDate },
             { name: "Relias Training Completed", key: "completedDate", completed: !!employee.completedDate, date: employee.completedDate },
             { name: "Level 1 Awarded", key: "secureCareAwarded", completed: employee.secureCareAwarded, date: employee.secureCareAwardedDate }
           ],
           total: 3,
           completed: [!!employee.assignedDate, !!employee.completedDate, employee.secureCareAwarded].filter(Boolean).length,
          color: "text-blue-600",
          icon: Users
        };
      case "associate":
        return {
          requirements: [
            { name: "Conference Completed", key: "conferenceCompleted", completed: !!employee.conferenceCompleted, date: employee.conferenceCompleted },
            { name: "Standing Video", key: "standingVideo", completed: !!employee.standingVideo, date: employee.standingVideo },
            { name: "Sleeping/Sitting Video", key: "sleepingVideo", completed: !!employee.sleepingVideo, date: employee.sleepingVideo },
            { name: "Feeding Video", key: "feedGradVideo", completed: !!employee.feedGradVideo, date: employee.feedGradVideo },
            { name: "Level 2 Awarded", key: "secureCareAwarded", completed: employee.secureCareAwarded, date: employee.secureCareAwardedDate }
          ],
          total: 5,
          completed: [!!employee.conferenceCompleted, 
                     !!employee.standingVideo, !!employee.sleepingVideo, !!employee.feedGradVideo, employee.secureCareAwarded].filter(Boolean).length,
          color: "text-green-600",
          icon: Award
        };
      case "champion":
        return {
          requirements: [
            { name: "Conference Completed", key: "conferenceCompleted", completed: !!employee.conferenceCompleted, date: employee.conferenceCompleted },
            { name: "Sitting/Standing/Approaching", key: "standingVideo", completed: !!employee.standingVideo, date: employee.standingVideo },
            { name: "No Hand/No Speak", key: "noHandnoSpeak", completed: !!employee.noHandnoSpeak, date: employee.noHandnoSpeak },
            { name: "Challenge Sleeping", key: "sleepingVideo", completed: !!employee.sleepingVideo, date: employee.sleepingVideo },
            { name: "Level 3 Awarded", key: "secureCareAwarded", completed: employee.secureCareAwarded, date: employee.secureCareAwardedDate }
          ],
          total: 5,
          completed: [!!employee.conferenceCompleted,
                     !!employee.standingVideo, !!employee.noHandnoSpeak, !!employee.sleepingVideo, employee.secureCareAwarded].filter(Boolean).length,
          color: "text-purple-600",
          icon: Star
        };
      case "consultant":
        return {
          requirements: [
            { name: "Conference Completed", key: "conferenceCompleted", completed: !!employee.conferenceCompleted, date: employee.conferenceCompleted },
            { name: "Coaching Session 1", key: "session1", completed: !!employee.session1, date: employee.session1 },
            { name: "Coaching Session 2", key: "session2", completed: !!employee.session2, date: employee.session2 },
            { name: "Coaching Session 3", key: "session3", completed: !!employee.session3, date: employee.session3 },
            { name: "Consultant Awarded", key: "secureCareAwarded", completed: employee.secureCareAwarded, date: employee.secureCareAwardedDate }
          ],
          total: 5,
          completed: [!!employee.conferenceCompleted,
                     !!employee.session1, !!employee.session2, !!employee.session3, employee.secureCareAwarded].filter(Boolean).length,
          color: "text-orange-600",
          icon: GraduationCap
        };
      case "coach":
        return {
          requirements: [
            { name: "Conference Completed", key: "conferenceCompleted", completed: !!employee.conferenceCompleted, date: employee.conferenceCompleted },
            { name: "Coaching Session 1", key: "session1", completed: !!employee.session1, date: employee.session1 },
            { name: "Coaching Session 2", key: "session2", completed: !!employee.session2, date: employee.session2 },
            { name: "Coaching Session 3", key: "session3", completed: !!employee.session3, date: employee.session3 },
            { name: "Coach Awarded", key: "secureCareAwarded", completed: employee.secureCareAwarded, date: employee.secureCareAwardedDate }
          ],
          total: 5,
          completed: [!!employee.conferenceCompleted,
                     !!employee.session1, !!employee.session2, !!employee.session3, employee.secureCareAwarded].filter(Boolean).length,
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
    if (date && scheduleTraining) {
      console.log('Scheduling training:', { employeeId, requirementKey, date, key });
      
      try {
        scheduleTraining({ employeeId, requirementKey, date });
        
        // Show success message
        toast.success('Training scheduled successfully!', {
          description: `Scheduled for ${date.toLocaleDateString()}`,
        });
        
        // Close the date picker
        setInlineDatePicker(null);
      } catch (error) {
        toast.error('Failed to schedule training');
      }
    }
  };

  const handleMarkComplete = async (employeeId: string, requirementKey: string) => {
    if (completeTraining) {
      try {
        // Backend will handle copying scheduled date to completion date
        completeTraining({ employeeId, requirementKey });
        
        toast.success('Training marked as complete!', {
          description: 'Completed using scheduled date',
        });
      } catch (error) {
        toast.error('Failed to mark training as complete');
      }
    }
  };

  const handleMarkAwarded = async (employeeId: string, requirementKey: string) => {
    if (awardTraining) {
      try {
        const currentDate = new Date();
        awardTraining({ employeeId, requirementKey, date: currentDate });
        
        toast.success('Level awarded successfully!', {
          description: `Awarded on ${currentDate.toLocaleDateString()}`,
        });
      } catch (error) {
        toast.error('Failed to award level');
      }
    }
  };

  const handleReschedule = async (employeeId: string, requirementKey: string, date: Date | undefined) => {
    if (date && rescheduleTraining) {
      try {
        rescheduleTraining({ employeeId, requirementKey, date });
        toast.success('Training rescheduled successfully!', {
          description: `Rescheduled for ${date.toLocaleDateString()}`,
        });
      } catch (error) {
        toast.error('Failed to reschedule training');
      }
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
    const isInlineDatePickerOpen = inlineDatePicker === key;
    const isConferenceRequirement = /ConferenceCompleted/i.test(requirement.key);
    const isLevel1 = currentLevel === 'care-partner';
    const awaiting = (employee as any).awaiting;
    const conferenceRejected = (employee as any).conferenceRejected;
    const awardTypeFromLevel = (levelKey: string): string => {
      switch (levelKey) {
        case 'associate':
          return 'Level 2';
        case 'champion':
          return 'Level 3';
        case 'consultant':
          return 'Consultant';
        case 'coach':
          return 'Coach';
        default:
          return 'Level 1';
      }
    };
    
    // Check if this requirement has a scheduled date in the employee data
    // For now, we'll use a simple approach - if it's not completed, it can be scheduled
    const canBeScheduled = !value && !requirement.key.includes("Awarded");
    
    console.log('getStatusBadge:', { 
      requirementKey: requirement.key, 
      key, 
      value, 
      canBeScheduled,
      isInlineDatePickerOpen 
    });

    if (requirement.key.includes("Awarded")) {
      const awardDateKey = requirement.key.replace("Awarded", "AwardedDate");
      const awardDate = employee[awardDateKey];
      
      // Check for existing awarded value first
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
                  {fmt.date(awardDate)}
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
                  onClick={() => handleMarkAwarded(String(employee.employeeId), requirement.key)}
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
    
    // Conference approval flow for all levels except Level 1
    if (isConferenceRequirement && !isLevel1) {
      if (conferenceRejected) {
        return (
          <div className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-sm font-semibold border border-red-200">
            <AlertCircle className="w-3 h-3" />
            <span className="text-sm">Rejected</span>
          </div>
        );
      }
      if (awaiting) {
        return (
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-sm font-semibold border border-amber-200">
              <Clock className="w-3 h-3" />
              <span className="text-sm">Awaiting Approval</span>
            </div>
            <button
              onClick={() => approveConference && approveConference({ employeeId: String(employee.employeeId) })}
              disabled={isApprovingConference}
              className="inline-flex items-center justify-center gap-1 bg-green-600 text-white px-2 py-1 rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {isApprovingConference ? 'Approving...' : 'Approve'}
            </button>
            <button
              onClick={() => rejectConference && rejectConference({ employeeId: String(employee.employeeId) })}
              disabled={isRejectingConference}
              className="inline-flex items-center justify-center gap-1 bg-red-600 text-white px-2 py-1 rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
            >
              {isRejectingConference ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        );
      }
      // If approved already, fall-through to completed rendering below
    }

    // For non-awarded requirements, check if they have a value (completed)
    if (value) {
      return (
        <div className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-2 py-1 rounded-full text-sm font-semibold shadow-sm">
          <CheckCircle className="w-3 h-3" />
          <span className="text-sm font-medium">
            {fmt.date(value)}
          </span>
        </div>
      );
    }
    
         // Check if can be scheduled (pending state)
     return (
       <div className="flex flex-col gap-1">
         {isInlineDatePickerOpen ? (
           <div className="flex items-center gap-2">
             <div className="min-w-[200px]">
               <DatePicker
                 date={undefined}
                 onDateChange={(date) => {
                   console.log('DatePicker onDateChange called with:', date);
                   handleScheduleDate(String(employee.employeeId), requirement.key, date);
                 }}
                 placeholder="Select date"
               />
             </div>
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

          {/* Advisor and Notes Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Advisor Assignment */}
            <Card className="relative">
              <ShineBorder
                borderWidth={1}
                duration={20}
                shineColor={["#8b5cf6", "#a855f7", "#c084fc"]}
                className="rounded-lg"
              />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-purple-600" />
                  Advisor Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="advisor-select" className="text-sm font-medium">
                    Assigned Advisor
                  </Label>
                  <Select
                    value={selectedAdvisorId}
                    onValueChange={handleAdvisorUpdate}
                    disabled={isUpdatingAdvisor}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an advisor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No advisor assigned</SelectItem>
                      {advisors.map((advisor) => (
                        <SelectItem key={advisor.advisorId} value={advisor.advisorId.toString()}>
                          {advisor.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {isUpdatingAdvisor && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    Updating advisor...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes Section */}
            <Card className="relative">
              <ShineBorder
                borderWidth={1}
                duration={20}
                shineColor={["#06b6d4", "#0891b2", "#0e7490"]}
                className="rounded-lg"
              />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-cyan-600" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notes-textarea" className="text-sm font-medium">
                    Employee Notes
                  </Label>
                  <Textarea
                    id="notes-textarea"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this employee..."
                    className="min-h-[100px] resize-none"
                    disabled={isUpdatingNotes}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {notes.length} characters
                  </div>
                  <Button
                    size="sm"
                    onClick={handleNotesUpdate}
                    disabled={isUpdatingNotes || notes === (employee.notes || "")}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    {isUpdatingNotes ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Notes
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

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
