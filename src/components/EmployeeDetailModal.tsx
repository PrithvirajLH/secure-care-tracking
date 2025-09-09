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
import { useTrainingData, trainingKeys } from "@/hooks/useTrainingData";
import { trainingAPI } from "@/services/api";
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface EmployeeDetailModalProps {
  employee: Employee;
  children: React.ReactNode;
  onModalOpenChange?: (isOpen: boolean) => void;
}

export default function EmployeeDetailModal({ employee, children, onModalOpenChange }: EmployeeDetailModalProps) {
  const [open, setOpen] = useState(false);
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [isUpdatingNotes, setIsUpdatingNotes] = useState(false);
  const [isUpdatingAdvisor, setIsUpdatingAdvisor] = useState(false);
  const queryClient = useQueryClient();

  // Check if employee has required fields
  const hasValidEmployeeId = employee?.employeeId && !isNaN(Number(employee.employeeId));
  
  // Fetch fresh employee data from API to ensure we have the latest data
  const { data: freshEmployeeData, isLoading: isLoadingEmployee, error: employeeError } = useQuery({
    queryKey: trainingKeys.employee(employee.employeeId.toString()),
    queryFn: () => {
      return trainingAPI.getEmployeeById(employee.employeeId.toString());
    },
    enabled: open && hasValidEmployeeId, // Only fetch when modal is open and has valid ID
    staleTime: 0, // Always fetch fresh data
  });

  // Also fetch all SecureCareEmployee records (all award types) for this employee
  const { data: levelRecords = [], error: levelsError } = useQuery({
    queryKey: ['employee-levels', String(employee.employeeId)],
    queryFn: () => {
      return trainingAPI.getEmployeeLevels(String(employee.employeeId));
    },
    enabled: open && hasValidEmployeeId,
    staleTime: 0,
  });


  // Always use fresh data from API - ignore the employee prop data for display
  // The employee prop is only used to get the employeeId for API calls
  const currentEmployee = freshEmployeeData || employee;
  
  // Check if we have complete data from API
  const hasCompleteApiData = !employeeError && !levelsError && levelRecords.length > 0;
  const shouldUseFallback = !hasCompleteApiData && employee;
  const isLoading = isLoadingEmployee || (open && hasValidEmployeeId && levelRecords.length === 0 && !levelsError);
  
  // Map between awardType and level key used in tabs
  const levelKeyToAwardType: Record<string, string> = {
    'care-partner': 'Level 1',
    'associate': 'Level 2',
    'champion': 'Level 3',
    'consultant': 'Consultant',
    'coach': 'Coach',
  };

  const awardTypeToRecord = useMemo(() => {
    const map: Record<string, any> = {};
    
    // Always prioritize API data - this gives us ALL level records for the employee
    if (levelRecords && levelRecords.length > 0) {
      (levelRecords as any[]).forEach((rec) => {
        if (rec?.awardType) {
          map[rec.awardType] = rec;
        }
      });
      return map;
    }
    
    // Fallback: if no API data, create a record from the employee prop
    if (employee?.awardType) {
      map[employee.awardType] = employee;
    }
    
    return map;
  }, [levelRecords, employee]);

  // Debug logging (can be removed in production)
  useEffect(() => {
    if (open) {
      // Debug logging removed
    }
  }, [open, levelRecords, employee, awardTypeToRecord, currentEmployee, freshEmployeeData, isLoadingEmployee]);
  
  const [notes, setNotes] = useState(employee.notes || "");
  const [selectedAdvisorId, setSelectedAdvisorId] = useState<string>(employee.advisorId?.toString() || "none");

  // Update notes and level when currentEmployee changes
  useEffect(() => {
    setNotes(currentEmployee.notes || "");
    setSelectedAdvisorId(currentEmployee.advisorId?.toString() || "none");
    setCurrentLevel(getEmployeeLevel(currentEmployee));
  }, [currentEmployee]);

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
    if (notes === (currentEmployee.notes || "")) return; // No changes
    
    setIsUpdatingNotes(true);
    try {
      await trainingAPI.updateEmployeeNotes(currentEmployee.employeeId.toString(), notes);
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: trainingKeys.employee(currentEmployee.employeeId.toString()) });
      queryClient.invalidateQueries({ queryKey: ['employee-levels', currentEmployee.employeeId.toString()] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'employees-unique' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'employees-training' });
      
      toast.success('Notes updated successfully');
    } catch (error) {
      console.error('Failed to update notes:', error);
      toast.error('Failed to update notes');
      setNotes(currentEmployee.notes || ""); // Revert on error
    } finally {
      setIsUpdatingNotes(false);
    }
  };

  // Handle advisor update
  const handleAdvisorUpdate = async (advisorId: string) => {
    const newAdvisorId = advisorId === "none" ? null : parseInt(advisorId);
    if (newAdvisorId === currentEmployee.advisorId) return; // No changes
    
    setIsUpdatingAdvisor(true);
    try {
      await trainingAPI.updateEmployeeAdvisor(currentEmployee.employeeId.toString(), newAdvisorId);
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: trainingKeys.employee(currentEmployee.employeeId.toString()) });
      queryClient.invalidateQueries({ queryKey: ['employee-levels', currentEmployee.employeeId.toString()] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'employees-unique' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'employees-training' });
      
      setSelectedAdvisorId(advisorId);
      toast.success('Advisor updated successfully');
    } catch (error) {
      console.error('Failed to update advisor:', error);
      toast.error('Failed to update advisor');
      setSelectedAdvisorId(currentEmployee.advisorId?.toString() || "none"); // Revert on error
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
  // Determine the correct level based on employee's award type
  const getEmployeeLevel = (employee: any) => {
    if (employee.awardType === 'Level 1') return 'care-partner';
    if (employee.awardType === 'Level 2') return 'associate';
    if (employee.awardType === 'Level 3') return 'champion';
    return 'care-partner'; // default
  };
  
  const [currentLevel, setCurrentLevel] = useState(() => getEmployeeLevel(employee));

  // Award gating per level to avoid showing awarded across other tabs
  const isAwardedFor = (levelName: string) => {
    return (currentEmployee as any).awardType === levelName && !!(currentEmployee as any).secureCareAwarded;
  };

  const getAwardedDateFor = (levelName: string) => {
    return isAwardedFor(levelName) ? (currentEmployee as any).secureCareAwardedDate : null;
  };

  // Original logic for backward compatibility when no level records are found
  const getLevelProgressWithEmployee = (level: string, employee: any) => {
    switch (level) {
      case "care-partner":
        return {
          requirements: [
            { name: "Relias Training Assigned", key: "assignedDate", completed: !!employee.assignedDate, date: employee.assignedDate },
            { name: "Relias Training Completed", key: "completedDate", completed: !!employee.completedDate, date: employee.completedDate },
            { name: "Level 1 Awarded", key: "secureCareAwarded", completed: isAwardedFor('Level 1'), date: getAwardedDateFor('Level 1') }
          ],
          total: 3,
          completed: [!!employee.assignedDate, !!employee.completedDate, isAwardedFor('Level 1')].filter(Boolean).length,
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
            { name: "Level 2 Awarded", key: "secureCareAwarded", completed: isAwardedFor('Level 2'), date: getAwardedDateFor('Level 2') }
          ],
          total: 5,
          completed: [!!employee.conferenceCompleted, !!employee.standingVideo, !!employee.sleepingVideo, !!employee.feedGradVideo, isAwardedFor('Level 2')].filter(Boolean).length,
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
            { name: "Level 3 Awarded", key: "secureCareAwarded", completed: isAwardedFor('Level 3'), date: getAwardedDateFor('Level 3') }
          ],
          total: 5,
          completed: [!!employee.conferenceCompleted, !!employee.standingVideo, !!employee.noHandnoSpeak, !!employee.sleepingVideo, isAwardedFor('Level 3')].filter(Boolean).length,
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
            { name: "Consultant Awarded", key: "secureCareAwarded", completed: isAwardedFor('Consultant'), date: getAwardedDateFor('Consultant') }
          ],
          total: 5,
          completed: [!!employee.conferenceCompleted, !!employee.session1, !!employee.session2, !!employee.session3, isAwardedFor('Consultant')].filter(Boolean).length,
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
            { name: "Coach Awarded", key: "secureCareAwarded", completed: isAwardedFor('Coach'), date: getAwardedDateFor('Coach') }
          ],
          total: 5,
          completed: [!!employee.conferenceCompleted, !!employee.session1, !!employee.session2, !!employee.session3, isAwardedFor('Coach')].filter(Boolean).length,
          color: "text-teal-600",
          icon: TrendingUp
        };
      default:
        return { requirements: [], total: 0, completed: 0, color: "", icon: Users };
    }
  };

  const getLevelProgress = (level: string) => {
    // For each level, we need to find the best record that shows the completion status for that level
    // This could be the specific awardType record OR a higher level record that shows completion of lower levels
    
    const awardTypeForLevel = levelKeyToAwardType[level];
    let recordForLevel: any | undefined = awardTypeToRecord[awardTypeForLevel];
    
    // Debug logging removed
    
    // If we don't have the specific awardType record, look for higher level records that might show completion
    if (!recordForLevel && levelRecords.length > 0) {
      // Find the highest level record that could contain data for this level
      const sortedRecords = levelRecords.sort((a, b) => {
        const levelOrder = { 'Level 1': 1, 'Level 2': 2, 'Level 3': 3, 'Consultant': 4, 'Coach': 5 };
        return (levelOrder[b.awardType] || 99) - (levelOrder[a.awardType] || 99);
      });
      
      // Use the highest level record as it will have the most complete data
      recordForLevel = sortedRecords[0];
    }
    
    // If still no record, try to use the current employee data as fallback
    if (!recordForLevel && currentEmployee) {
      recordForLevel = currentEmployee;
    }
    
    // If still no record, return empty progress
    if (!recordForLevel) {
      return { requirements: [], total: 0, completed: 0, color: "", icon: Users } as any;
    }
    switch (level) {
      case "care-partner":
        // For Level 1, check if employee has completed Level 1 or higher
        const hasLevel1Record = awardTypeToRecord['Level 1'];
        const level1Completed = hasLevel1Record ? !!hasLevel1Record.secureCareAwarded : (recordForLevel.awardType === 'Level 1' && !!recordForLevel.secureCareAwarded);
        const level1AwardedDate = hasLevel1Record ? hasLevel1Record.secureCareAwardedDate : (recordForLevel.awardType === 'Level 1' ? recordForLevel.secureCareAwardedDate : null);
        
        return {
          requirements: [
            { name: "Relias Training Assigned", key: "assignedDate", completed: !!recordForLevel.assignedDate, date: recordForLevel.assignedDate },
            { name: "Relias Training Completed", key: "completedDate", completed: !!recordForLevel.completedDate, date: recordForLevel.completedDate },
            { name: "Level 1 Awarded", key: "secureCareAwarded", completed: level1Completed, date: level1AwardedDate }
          ],
          total: 3,
          completed: [!!recordForLevel.assignedDate, !!recordForLevel.completedDate, level1Completed].filter(Boolean).length,
          color: "text-blue-600",
          icon: Users
        };
      case "associate":
        // For Level 2, check if employee has completed Level 2 or higher
        const hasLevel2Record = awardTypeToRecord['Level 2'];
        const level2Completed = hasLevel2Record ? !!hasLevel2Record.secureCareAwarded : (recordForLevel.awardType === 'Level 2' && !!recordForLevel.secureCareAwarded);
        const level2AwardedDate = hasLevel2Record ? hasLevel2Record.secureCareAwardedDate : (recordForLevel.awardType === 'Level 2' ? recordForLevel.secureCareAwardedDate : null);
        
        return {
          requirements: [
            { name: "Conference Completed", key: "conferenceCompleted", completed: !!recordForLevel.conferenceCompleted, date: recordForLevel.conferenceCompleted },
            { name: "Standing Video", key: "standingVideo", completed: !!recordForLevel.standingVideo, scheduled: !!recordForLevel.scheduleStandingVideo, date: recordForLevel.standingVideo || recordForLevel.scheduleStandingVideo },
            { name: "Sleeping/Sitting Video", key: "sleepingVideo", completed: !!recordForLevel.sleepingVideo, scheduled: !!recordForLevel.scheduleSleepingVideo, date: recordForLevel.sleepingVideo || recordForLevel.scheduleSleepingVideo },
            { name: "Feeding Video", key: "feedGradVideo", completed: !!recordForLevel.feedGradVideo, scheduled: !!recordForLevel.scheduleFeedGradVideo, date: recordForLevel.feedGradVideo || recordForLevel.scheduleFeedGradVideo },
            { name: "Level 2 Awarded", key: "secureCareAwarded", completed: level2Completed, date: level2AwardedDate }
          ],
          total: 5,
          completed: [!!recordForLevel.conferenceCompleted, !!recordForLevel.standingVideo, !!recordForLevel.sleepingVideo, !!recordForLevel.feedGradVideo, level2Completed].filter(Boolean).length,
          color: "text-green-600",
          icon: Award
        };
      case "champion":
        // For Level 3, check if employee has completed Level 3 or higher
        const hasLevel3Record = awardTypeToRecord['Level 3'];
        const level3Completed = hasLevel3Record ? !!hasLevel3Record.secureCareAwarded : (recordForLevel.awardType === 'Level 3' && !!recordForLevel.secureCareAwarded);
        const level3AwardedDate = hasLevel3Record ? hasLevel3Record.secureCareAwardedDate : (recordForLevel.awardType === 'Level 3' ? recordForLevel.secureCareAwardedDate : null);
        
        return {
          requirements: [
            { name: "Conference Completed", key: "conferenceCompleted", completed: !!recordForLevel.conferenceCompleted, date: recordForLevel.conferenceCompleted },
            { name: "Sitting/Standing/Approaching", key: "standingVideo", completed: !!recordForLevel.standingVideo, scheduled: !!recordForLevel.scheduleStandingVideo, date: recordForLevel.standingVideo || recordForLevel.scheduleStandingVideo },
            { name: "No Hand/No Speak", key: "noHandnoSpeak", completed: !!recordForLevel.noHandnoSpeak, scheduled: !!recordForLevel.schedulenoHandnoSpeak, date: recordForLevel.noHandnoSpeak || recordForLevel.schedulenoHandnoSpeak },
            { name: "Challenge Sleeping", key: "sleepingVideo", completed: !!recordForLevel.sleepingVideo, scheduled: !!recordForLevel.scheduleSleepingVideo, date: recordForLevel.sleepingVideo || recordForLevel.scheduleSleepingVideo },
            { name: "Level 3 Awarded", key: "secureCareAwarded", completed: level3Completed, date: level3AwardedDate }
          ],
          total: 5,
          completed: [!!recordForLevel.conferenceCompleted, !!recordForLevel.standingVideo, !!recordForLevel.noHandnoSpeak, !!recordForLevel.sleepingVideo, level3Completed].filter(Boolean).length,
          color: "text-purple-600",
          icon: Star
        };
      case "consultant":
        // For Consultant, check if employee has completed Consultant or higher
        const hasConsultantRecord = awardTypeToRecord['Consultant'];
        const consultantCompleted = hasConsultantRecord ? !!hasConsultantRecord.secureCareAwarded : (recordForLevel.awardType === 'Consultant' && !!recordForLevel.secureCareAwarded);
        const consultantAwardedDate = hasConsultantRecord ? hasConsultantRecord.secureCareAwardedDate : (recordForLevel.awardType === 'Consultant' ? recordForLevel.secureCareAwardedDate : null);
        
        return {
          requirements: [
            { name: "Conference Completed", key: "conferenceCompleted", completed: !!recordForLevel.conferenceCompleted, date: recordForLevel.conferenceCompleted },
            { name: "Coaching Session 1", key: "session1", completed: !!recordForLevel.session1, scheduled: !!recordForLevel.scheduleSession1, date: recordForLevel.session1 || recordForLevel.scheduleSession1 },
            { name: "Coaching Session 2", key: "session2", completed: !!recordForLevel.session2, scheduled: !!recordForLevel.scheduleSession2, date: recordForLevel.session2 || recordForLevel.scheduleSession2 },
            { name: "Coaching Session 3", key: "session3", completed: !!recordForLevel.session3, scheduled: !!recordForLevel.scheduleSession3, date: recordForLevel.session3 || recordForLevel.scheduleSession3 },
            { name: "Consultant Awarded", key: "secureCareAwarded", completed: consultantCompleted, date: consultantAwardedDate }
          ],
          total: 5,
          completed: [!!recordForLevel.conferenceCompleted, !!recordForLevel.session1, !!recordForLevel.session2, !!recordForLevel.session3, consultantCompleted].filter(Boolean).length,
          color: "text-orange-600",
          icon: GraduationCap
        };
      case "coach":
        // For Coach, check if employee has completed Coach
        const hasCoachRecord = awardTypeToRecord['Coach'];
        const coachCompleted = hasCoachRecord ? !!hasCoachRecord.secureCareAwarded : (recordForLevel.awardType === 'Coach' && !!recordForLevel.secureCareAwarded);
        const coachAwardedDate = hasCoachRecord ? hasCoachRecord.secureCareAwardedDate : (recordForLevel.awardType === 'Coach' ? recordForLevel.secureCareAwardedDate : null);
        
        return {
          requirements: [
            { name: "Conference Completed", key: "conferenceCompleted", completed: !!recordForLevel.conferenceCompleted, date: recordForLevel.conferenceCompleted },
            { name: "Coaching Session 1", key: "session1", completed: !!recordForLevel.session1, scheduled: !!recordForLevel.scheduleSession1, date: recordForLevel.session1 || recordForLevel.scheduleSession1 },
            { name: "Coaching Session 2", key: "session2", completed: !!recordForLevel.session2, scheduled: !!recordForLevel.scheduleSession2, date: recordForLevel.session2 || recordForLevel.scheduleSession2 },
            { name: "Coaching Session 3", key: "session3", completed: !!recordForLevel.session3, scheduled: !!recordForLevel.scheduleSession3, date: recordForLevel.session3 || recordForLevel.scheduleSession3 },
            { name: "Coach Awarded", key: "secureCareAwarded", completed: coachCompleted, date: coachAwardedDate }
          ],
          total: 5,
          completed: [!!recordForLevel.conferenceCompleted, !!recordForLevel.session1, !!recordForLevel.session2, !!recordForLevel.session3, coachCompleted].filter(Boolean).length,
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
        // Still close the date picker even if there's an error
        setInlineDatePicker(null);
      }
    } else {
      // Close the date picker even if no date was selected
      setInlineDatePicker(null);
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

  // Click outside and escape key handler for inline date picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (inlineDatePicker && 
          !target.closest('.inline-date-picker') &&
          !target.closest('[data-radix-popper-content-wrapper]') &&
          !target.closest('[data-radix-popper-content]') &&
          !target.closest('[role="dialog"]') &&
          !target.closest('.rdp') &&
          !target.closest('[data-radix-collection-item]')) {
        closeInlineDatePicker();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && inlineDatePicker) {
        closeInlineDatePicker();
      }
    };

    if (inlineDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [inlineDatePicker]);

  // Get status badge for requirements
  const getStatusBadge = (requirement: any) => {
    // Use the record that matches the currently selected level/awardType
    const awardTypeForLevel = levelKeyToAwardType[currentLevel];
    const record = awardTypeToRecord[awardTypeForLevel];
    
    // If no record exists for this awardType, don't show any data
    if (!record) {
      return (
        <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-400 px-2 py-1 rounded-full text-sm font-semibold cursor-not-allowed w-20">
          <Clock className="w-3 h-3" />
          <span className="text-sm">No Data</span>
        </div>
      );
    }

    const value = (record as any)[requirement.key];
    
    // Map requirement keys to their corresponding schedule field names
    const scheduleFieldMap: Record<string, string> = {
      'standingVideo': 'scheduleStandingVideo',
      'sleepingVideo': 'scheduleSleepingVideo', 
      'feedGradVideo': 'scheduleFeedGradVideo',
      'noHandnoSpeak': 'schedulenoHandnoSpeak',
      'session1': 'scheduleSession1',
      'session2': 'scheduleSession2',
      'session3': 'scheduleSession3'
    };
    
    const scheduleFieldName = scheduleFieldMap[requirement.key];
    const scheduledValue = scheduleFieldName ? (record as any)[scheduleFieldName] : null;
    
    const key = `${record.employeeId}-${requirement.key}`;
    const isInlineDatePickerOpen = inlineDatePicker === key;
    const isConferenceRequirement = /ConferenceCompleted/i.test(requirement.key);

    // Helper to check awarded for the active level using the active record
    const isAwardedThisLevel = (record as any).awardType === awardTypeForLevel && !!(record as any).secureCareAwarded;
    const awardedDateForThisLevel = isAwardedThisLevel ? (record as any).secureCareAwardedDate : null;

    // Only non-award items can be scheduled/completed here
    const canBeScheduled = !value && !requirement.key.includes("Awarded");

    // Award rows
    if (requirement.key.includes("Awarded")) {
      if (isAwardedThisLevel) {
        return (
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center justify-center gap-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-1 rounded-full text-sm font-semibold shadow-sm w-20">
              <Award className="w-3 h-3" />
              <span className="text-sm">Awarded</span>
            </div>
            {awardedDateForThisLevel && (
              <div className="inline-flex items-center justify-center gap-1 bg-green-50 border border-green-200 rounded px-2 py-1 w-20">
                <span className="text-sm text-green-700 font-medium">{fmt.date(awardedDateForThisLevel)}</span>
              </div>
            )}
          </div>
        );
      }

      const { canAward, missingRequirements } = canAwardLevel(currentLevel, requirement.key);
      if (canAward) {
        return (
          <div className="flex flex-col gap-1">
            {isInlineDatePickerOpen ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMarkAwarded(String(record.employeeId), requirement.key)}
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
                <button disabled className="inline-flex items-center justify-center gap-1 bg-gray-100 text-gray-400 px-2 py-1 rounded-full text-sm font-semibold cursor-not-allowed w-20">
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

    // Conference approval flow for Level 2+ uses the active record
    if (isConferenceRequirement && awardTypeForLevel !== 'Level 1') {
      const isAwaitingThisLevel = ((record as any).awaiting === 1 || (record as any).awaiting === true);
      const isRejectedThisLevel = (record as any).awaiting === null;

      if (isRejectedThisLevel) {
        return (
          <div className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-sm font-semibold border border-red-200">
            <AlertCircle className="w-3 h-3" />
            <span className="text-sm">Rejected</span>
          </div>
        );
      }
      if (isAwaitingThisLevel) {
        return (
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-sm font-semibold border border-amber-200">
              <Clock className="w-3 h-3" />
              <span className="text-sm">Awaiting Approval</span>
            </div>
            <button
              onClick={() => approveConference && approveConference({ employeeId: String(record.employeeId) })}
              disabled={isApprovingConference}
              className="inline-flex items-center justify-center gap-1 bg-green-600 text-white px-2 py-1 rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {isApprovingConference ? 'Approving...' : 'Approve'}
            </button>
            <button
              onClick={() => rejectConference && rejectConference({ employeeId: String(record.employeeId) })}
              disabled={isRejectingConference}
              className="inline-flex items-center justify-center gap-1 bg-red-600 text-white px-2 py-1 rounded-md text-sm hover:bg-red-700 disabled:opacity-50"
            >
              {isRejectingConference ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        );
      }
    }

    // Completed state uses the active record
    if (value) {
      return (
        <div className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-2 py-1 rounded-full text-sm font-semibold shadow-sm">
          <CheckCircle className="w-3 h-3" />
          <span className="text-sm font-medium">{fmt.date(value)}</span>
        </div>
      );
    }

    // Scheduled state - show scheduled date
    if (scheduledValue) {
      return (
        <div className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-1 rounded-full text-sm font-semibold shadow-sm">
          <Calendar className="w-3 h-3" />
          <span className="text-sm font-medium">{fmt.date(scheduledValue)}</span>
        </div>
      );
    }

    // Pending/schedule UI (inline) for this record
    return (
      <div className="flex flex-col gap-1">
        {isInlineDatePickerOpen ? (
          <div className="flex items-center gap-2 inline-date-picker">
            <div className="min-w-[200px]">
              <DatePicker
                date={undefined}
                onDateChange={(date) => handleScheduleDate(String(record.employeeId), requirement.key, date)}
                placeholder="Select date"
                open={isInlineDatePickerOpen}
                onOpenChange={(open) => {
                  if (!open) {
                    setInlineDatePicker(null);
                  }
                }}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInlineDatePicker(null)}
              className="h-8 w-8 p-0"
            >
              ×
            </Button>
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
        <DialogContent className="max-w-4xl modal-container p-0">
        <div className="modal-content p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <User className="w-6 h-6" />
            Employee Details
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading employee data...</p>
            </div>
          </div>
        ) : (
        <div className="space-y-6">
          {/* Employee Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{currentEmployee.name || (employee as any).Employee}</span>
                <Badge variant="outline">{(employee as any).staffRoll || (employee as any).staffRoles || 'N/A'}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{currentEmployee.facility || (employee as any).Facility}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{currentEmployee.area || (employee as any).Area}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{(employee as any).employeeNumber || currentEmployee.employeeId}</span>
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
                      <SelectItem value="none">No advisor assigned</SelectItem>
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
                    placeholder="Add notes about this currentEmployee..."
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
                    disabled={isUpdatingNotes || notes === (currentEmployee.notes || "")}
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
                      {level.progress.total === 0 ? (
                        <div className="text-sm text-muted-foreground">No data for this level.</div>
                      ) : (
                        level.progress.requirements.map((req, index) => (
                          <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{req.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(req)}
                            </div>
                          </div>
                        ))
                      )}
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
          </div>
        </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
}
