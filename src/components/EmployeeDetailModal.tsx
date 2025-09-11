import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
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
import { fmt, parseDate, NOTES_OPTIONS } from "@/config/awardTypes";
// import { motion, AnimatePresence } from "framer-motion"; // Removed for faster loading
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
import { useAdvisors } from '@/hooks/useEmployees';

interface EmployeeDetailModalProps {
  employee: Employee;
  children: React.ReactNode;
  onModalOpenChange?: (isOpen: boolean) => void;
}

export default function EmployeeDetailModal({ employee, children, onModalOpenChange }: EmployeeDetailModalProps) {
  const [open, setOpen] = useState(false);
  // Use React Query for advisors data
  const { data: advisors = [] } = useAdvisors();
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
  const { data: levelRecords = [], error: levelsError, isLoading: isLoadingLevels } = useQuery({
    queryKey: ['employee-levels', String(employee.employeeId)],
    queryFn: async () => {
      console.log('🔍 Fetching employee levels for ID:', employee.employeeId);
      const result = await trainingAPI.getEmployeeLevels(String(employee.employeeId));
      console.log('🔍 Employee levels API result:', result);
      return result;
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
  const isLoading = isLoadingEmployee || isLoadingLevels || (open && hasValidEmployeeId && levelRecords.length === 0 && !levelsError);
  
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

  // Debug logging to investigate querying issues
  useEffect(() => {
    if (open) {
      console.log('🔍 Employee Detail Modal Debug:');
      console.log('Employee ID:', employee.employeeId);
      console.log('Level Records:', levelRecords);
      console.log('AwardType to Record Map:', awardTypeToRecord);
      console.log('Current Employee:', currentEmployee);
      console.log('Levels Error:', levelsError);
      console.log('Is Loading Levels:', isLoadingLevels);
    }
  }, [open, levelRecords, employee, awardTypeToRecord, currentEmployee, freshEmployeeData, isLoadingEmployee, levelsError]);
  
  // Level-specific state for advisor and notes
  const [levelStates, setLevelStates] = useState<Record<string, {
    advisorId: string;
    notes: string;
    isUpdatingAdvisor: boolean;
    isUpdatingNotes: boolean;
  }>>({});

  // Initialize level states when levelRecords change
  useEffect(() => {
    if (levelRecords && levelRecords.length > 0) {
      const newLevelStates: Record<string, {
        advisorId: string;
        notes: string;
        isUpdatingAdvisor: boolean;
        isUpdatingNotes: boolean;
      }> = {};
      
      levelRecords.forEach((record: any) => {
        if (record.awardType) {
          const levelKey = Object.keys(levelKeyToAwardType).find(
            key => levelKeyToAwardType[key] === record.awardType
          ) || record.awardType.toLowerCase().replace(' ', '-');
          
          newLevelStates[levelKey] = {
            advisorId: record.advisorId?.toString() || "none",
            notes: record.notes || "",
            isUpdatingAdvisor: false,
            isUpdatingNotes: false,
          };
        }
      });
      
      setLevelStates(newLevelStates);
    }
  }, [levelRecords]);

  // Update current level when currentEmployee changes
  useEffect(() => {
    setCurrentLevel(getEmployeeLevel(currentEmployee));
  }, [currentEmployee]);

  // Notify parent component when modal opens/closes
  useEffect(() => {
    if (onModalOpenChange) {
      onModalOpenChange(open);
    }
  }, [open, onModalOpenChange]);

  // Advisors are automatically loaded via React Query useAdvisors hook

  // Handle level-specific notes update
  const handleLevelNotesUpdate = async (levelKey: string, newNotes: string) => {
    const currentLevelState = levelStates[levelKey];
    if (!currentLevelState) return;
    
    const currentNotes = currentLevelState.notes;
    if (newNotes === currentNotes) return; // No changes
    
    // Update UI immediately
    setLevelStates(prev => ({
      ...prev,
      [levelKey]: { ...prev[levelKey], notes: newNotes, isUpdatingNotes: true }
    }));
    
    try {
      // Get the awardType for this level
      const awardType = levelKeyToAwardType[levelKey];
      if (!awardType) {
        throw new Error('Invalid level key');
      }
      
      // Update notes for the specific level/awardType
      await trainingAPI.updateEmployeeNotesForLevel(currentEmployee.employeeId.toString(), awardType, newNotes);
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: trainingKeys.employee(currentEmployee.employeeId.toString()) });
      queryClient.invalidateQueries({ queryKey: ['employee-levels', currentEmployee.employeeId.toString()] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'employees-unique' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'employees-training' });
      
      toast.success(`Notes updated successfully for ${awardType}`);
    } catch (error) {
      console.error('Failed to update notes:', error);
      toast.error('Failed to update notes');
      // Revert on error
      setLevelStates(prev => ({
        ...prev,
        [levelKey]: { ...prev[levelKey], notes: currentNotes, isUpdatingNotes: false }
      }));
    } finally {
      setLevelStates(prev => ({
        ...prev,
        [levelKey]: { ...prev[levelKey], isUpdatingNotes: false }
      }));
    }
  };

  // Handle level-specific advisor update
  const handleLevelAdvisorUpdate = async (levelKey: string, advisorId: string) => {
    const currentLevelState = levelStates[levelKey];
    if (!currentLevelState) return;
    
    const currentAdvisorId = currentLevelState.advisorId;
    if (advisorId === currentAdvisorId) return; // No changes
    
    // Update UI immediately
    setLevelStates(prev => ({
      ...prev,
      [levelKey]: { ...prev[levelKey], advisorId: advisorId, isUpdatingAdvisor: true }
    }));
    
    try {
      // Get the awardType for this level
      const awardType = levelKeyToAwardType[levelKey];
      if (!awardType) {
        throw new Error('Invalid level key');
      }
      
      const newAdvisorId = advisorId === "none" ? null : parseInt(advisorId);
      
      // Update advisor for the specific level/awardType
      await trainingAPI.updateEmployeeAdvisorForLevel(currentEmployee.employeeId.toString(), awardType, newAdvisorId);
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: trainingKeys.employee(currentEmployee.employeeId.toString()) });
      queryClient.invalidateQueries({ queryKey: ['employee-levels', currentEmployee.employeeId.toString()] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'employees-unique' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'employees-training' });
      
      toast.success(`Advisor updated successfully for ${awardType}`);
    } catch (error) {
      console.error('Failed to update advisor:', error);
      toast.error('Failed to update advisor');
      // Revert on error
      setLevelStates(prev => ({
        ...prev,
        [levelKey]: { ...prev[levelKey], advisorId: currentAdvisorId, isUpdatingAdvisor: false }
      }));
    } finally {
      setLevelStates(prev => ({
        ...prev,
        [levelKey]: { ...prev[levelKey], isUpdatingAdvisor: false }
      }));
    }
  };
  // Use the training data hook for API operations
  const {
    scheduleTraining,
    completeTraining,
    rescheduleTraining,
    // Async variants
    scheduleTrainingAsync,
    completeTrainingAsync,
    rescheduleTrainingAsync,
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
    // Query database by awardType for each level
    const awardTypeForLevel = levelKeyToAwardType[level];
    const recordForLevel: any | undefined = awardTypeToRecord[awardTypeForLevel];
    
    // Debug logging for level progress
    console.log(`🔍 Level Progress Debug for ${level}:`);
    console.log(`  - AwardType: ${awardTypeForLevel}`);
    console.log(`  - Record Found:`, recordForLevel);
    console.log(`  - AwardTypeToRecord Map:`, awardTypeToRecord);
    
    // If no record exists for this awardType, return empty progress (no data)
    if (!recordForLevel) {
      console.log(`  - No record found for ${awardTypeForLevel}, returning empty progress`);
      return { 
        requirements: [], 
        total: 0, 
        completed: 0, 
        color: "", 
        icon: Users,
        isAwarded: false,
        hasData: false
      } as any;
    }

    // Helper function to check if a level is completed (either directly or through higher level)
    const isLevelCompleted = (targetLevel: string) => {
      const targetAwardType = levelKeyToAwardType[targetLevel];
      const levelOrder = { 'Level 1': 1, 'Level 2': 2, 'Level 3': 3, 'Consultant': 4, 'Coach': 5 };
      const targetOrder = levelOrder[targetAwardType] || 0;
      
      // Check if we have a direct record for this level
      const directRecord = awardTypeToRecord[targetAwardType];
      if (directRecord && directRecord.secureCareAwarded) {
        return true;
      }
      
      // Check if we have a higher level record that implies this level is completed
      for (const record of levelRecords) {
        const recordOrder = levelOrder[record.awardType] || 0;
        if (recordOrder > targetOrder && record.secureCareAwarded) {
          return true;
        }
      }
      
      return false;
    };
    switch (level) {
      case "care-partner":
        // For Level 1, check if this specific awardType is awarded
        const isLevel1Awarded = !!recordForLevel.secureCareAwarded;
        const level1AwardedDate = recordForLevel.secureCareAwardedDate;
        
        // If awarded, show 100% progress
        if (isLevel1Awarded) {
          return {
            requirements: [
              { name: "Relias Training Assigned", key: "assignedDate", completed: true, date: recordForLevel.assignedDate },
              { name: "Relias Training Completed", key: "completedDate", completed: true, date: recordForLevel.completedDate },
              { name: "Level 1 Awarded", key: "secureCareAwarded", completed: true, date: level1AwardedDate }
            ],
            total: 3,
            completed: 3,
            color: "text-blue-600",
            icon: Users,
            isAwarded: true,
            hasData: true
          };
        }
        
        // If not awarded, calculate actual progress
        return {
          requirements: [
            { name: "Relias Training Assigned", key: "assignedDate", completed: !!recordForLevel.assignedDate, date: recordForLevel.assignedDate },
            { name: "Relias Training Completed", key: "completedDate", completed: !!recordForLevel.completedDate, date: recordForLevel.completedDate },
            { name: "Level 1 Awarded", key: "secureCareAwarded", completed: false, date: null }
          ],
          total: 3,
          completed: [!!recordForLevel.assignedDate, !!recordForLevel.completedDate].filter(Boolean).length,
          color: "text-blue-600",
          icon: Users,
          isAwarded: false,
          hasData: true
        };
      case "associate":
        // For Level 2, check if this specific awardType is awarded
        const isLevel2Awarded = !!recordForLevel.secureCareAwarded;
        const level2AwardedDate = recordForLevel.secureCareAwardedDate;
        
        // If awarded, show 100% progress
        if (isLevel2Awarded) {
          return {
            requirements: [
              { name: "Conference Completed", key: "conferenceCompleted", completed: true, date: recordForLevel.conferenceCompleted },
              { name: "Standing Video", key: "standingVideo", completed: true, date: recordForLevel.standingVideo },
              { name: "Sleeping/Sitting Video", key: "sleepingVideo", completed: true, date: recordForLevel.sleepingVideo },
              { name: "Feeding Video", key: "feedGradVideo", completed: true, date: recordForLevel.feedGradVideo },
              { name: "Level 2 Awarded", key: "secureCareAwarded", completed: true, date: level2AwardedDate }
            ],
            total: 5,
            completed: 5,
            color: "text-green-600",
            icon: Award,
            isAwarded: true,
            hasData: true
          };
        }
        
        // If not awarded, calculate actual progress
        return {
          requirements: [
            { name: "Conference Completed", key: "conferenceCompleted", completed: !!recordForLevel.conferenceCompleted, date: recordForLevel.conferenceCompleted },
            { name: "Standing Video", key: "standingVideo", completed: !!recordForLevel.standingVideo, scheduled: !!recordForLevel.scheduleStandingVideo, date: recordForLevel.standingVideo || recordForLevel.scheduleStandingVideo },
            { name: "Sleeping/Sitting Video", key: "sleepingVideo", completed: !!recordForLevel.sleepingVideo, scheduled: !!recordForLevel.scheduleSleepingVideo, date: recordForLevel.sleepingVideo || recordForLevel.scheduleSleepingVideo },
            { name: "Feeding Video", key: "feedGradVideo", completed: !!recordForLevel.feedGradVideo, scheduled: !!recordForLevel.scheduleFeedGradVideo, date: recordForLevel.feedGradVideo || recordForLevel.scheduleFeedGradVideo },
            { name: "Level 2 Awarded", key: "secureCareAwarded", completed: false, date: null }
          ],
          total: 5,
          completed: [!!recordForLevel.conferenceCompleted, !!recordForLevel.standingVideo, !!recordForLevel.sleepingVideo, !!recordForLevel.feedGradVideo].filter(Boolean).length,
          color: "text-green-600",
          icon: Award,
          isAwarded: false,
          hasData: true
        };
      case "champion":
        // For Level 3, check if this specific awardType is awarded
        const isLevel3Awarded = !!recordForLevel.secureCareAwarded;
        const level3AwardedDate = recordForLevel.secureCareAwardedDate;
        
        // If awarded, show 100% progress
        if (isLevel3Awarded) {
          return {
            requirements: [
              { name: "Conference Completed", key: "conferenceCompleted", completed: true, date: recordForLevel.conferenceCompleted },
              { name: "Sitting/Standing/Approaching", key: "standingVideo", completed: true, date: recordForLevel.standingVideo },
              { name: "No Hand/No Speak", key: "noHandnoSpeak", completed: true, date: recordForLevel.noHandnoSpeak },
              { name: "Challenge Sleeping", key: "sleepingVideo", completed: true, date: recordForLevel.sleepingVideo },
              { name: "Level 3 Awarded", key: "secureCareAwarded", completed: true, date: level3AwardedDate }
            ],
            total: 5,
            completed: 5,
            color: "text-purple-600",
            icon: Star,
            isAwarded: true,
            hasData: true
          };
        }
        
        // If not awarded, calculate actual progress
        return {
          requirements: [
            { name: "Conference Completed", key: "conferenceCompleted", completed: !!recordForLevel.conferenceCompleted, date: recordForLevel.conferenceCompleted },
            { name: "Sitting/Standing/Approaching", key: "standingVideo", completed: !!recordForLevel.standingVideo, scheduled: !!recordForLevel.scheduleStandingVideo, date: recordForLevel.standingVideo || recordForLevel.scheduleStandingVideo },
            { name: "No Hand/No Speak", key: "noHandnoSpeak", completed: !!recordForLevel.noHandnoSpeak, scheduled: !!recordForLevel.schedulenoHandnoSpeak, date: recordForLevel.noHandnoSpeak || recordForLevel.schedulenoHandnoSpeak },
            { name: "Challenge Sleeping", key: "sleepingVideo", completed: !!recordForLevel.sleepingVideo, scheduled: !!recordForLevel.scheduleSleepingVideo, date: recordForLevel.sleepingVideo || recordForLevel.scheduleSleepingVideo },
            { name: "Level 3 Awarded", key: "secureCareAwarded", completed: false, date: null }
          ],
          total: 5,
          completed: [!!recordForLevel.conferenceCompleted, !!recordForLevel.standingVideo, !!recordForLevel.noHandnoSpeak, !!recordForLevel.sleepingVideo].filter(Boolean).length,
          color: "text-purple-600",
          icon: Star,
          isAwarded: false,
          hasData: true
        };
      case "consultant":
        // For Consultant, check if this specific awardType is awarded
        const isConsultantAwarded = !!recordForLevel.secureCareAwarded;
        const consultantAwardedDate = recordForLevel.secureCareAwardedDate;
        
        // If awarded, show 100% progress
        if (isConsultantAwarded) {
          return {
            requirements: [
              { name: "Conference Completed", key: "conferenceCompleted", completed: true, date: recordForLevel.conferenceCompleted },
              { name: "Coaching Session 1", key: "session1", completed: true, date: recordForLevel.session1 },
              { name: "Coaching Session 2", key: "session2", completed: true, date: recordForLevel.session2 },
              { name: "Coaching Session 3", key: "session3", completed: true, date: recordForLevel.session3 },
              { name: "Consultant Awarded", key: "secureCareAwarded", completed: true, date: consultantAwardedDate }
            ],
            total: 5,
            completed: 5,
            color: "text-orange-600",
            icon: GraduationCap,
            isAwarded: true,
            hasData: true
          };
        }
        
        // If not awarded, calculate actual progress
        return {
          requirements: [
            { name: "Conference Completed", key: "conferenceCompleted", completed: !!recordForLevel.conferenceCompleted, date: recordForLevel.conferenceCompleted },
            { name: "Coaching Session 1", key: "session1", completed: !!recordForLevel.session1, scheduled: !!recordForLevel.scheduleSession1, date: recordForLevel.session1 || recordForLevel.scheduleSession1 },
            { name: "Coaching Session 2", key: "session2", completed: !!recordForLevel.session2, scheduled: !!recordForLevel.scheduleSession2, date: recordForLevel.session2 || recordForLevel.scheduleSession2 },
            { name: "Coaching Session 3", key: "session3", completed: !!recordForLevel.session3, scheduled: !!recordForLevel.scheduleSession3, date: recordForLevel.session3 || recordForLevel.scheduleSession3 },
            { name: "Consultant Awarded", key: "secureCareAwarded", completed: false, date: null }
          ],
          total: 5,
          completed: [!!recordForLevel.conferenceCompleted, !!recordForLevel.session1, !!recordForLevel.session2, !!recordForLevel.session3].filter(Boolean).length,
          color: "text-orange-600",
          icon: GraduationCap,
          isAwarded: false,
          hasData: true
        };
      case "coach":
        // For Coach, check if this specific awardType is awarded
        const isCoachAwarded = !!recordForLevel.secureCareAwarded;
        const coachAwardedDate = recordForLevel.secureCareAwardedDate;
        
        // If awarded, show 100% progress
        if (isCoachAwarded) {
          return {
            requirements: [
              { name: "Conference Completed", key: "conferenceCompleted", completed: true, date: recordForLevel.conferenceCompleted },
              { name: "Coaching Session 1", key: "session1", completed: true, date: recordForLevel.session1 },
              { name: "Coaching Session 2", key: "session2", completed: true, date: recordForLevel.session2 },
              { name: "Coaching Session 3", key: "session3", completed: true, date: recordForLevel.session3 },
              { name: "Coach Awarded", key: "secureCareAwarded", completed: true, date: coachAwardedDate }
            ],
            total: 5,
            completed: 5,
            color: "text-teal-600",
            icon: TrendingUp,
            isAwarded: true,
            hasData: true
          };
        }
        
        // If not awarded, calculate actual progress
        return {
          requirements: [
            { name: "Conference Completed", key: "conferenceCompleted", completed: !!recordForLevel.conferenceCompleted, date: recordForLevel.conferenceCompleted },
            { name: "Coaching Session 1", key: "session1", completed: !!recordForLevel.session1, scheduled: !!recordForLevel.scheduleSession1, date: recordForLevel.session1 || recordForLevel.scheduleSession1 },
            { name: "Coaching Session 2", key: "session2", completed: !!recordForLevel.session2, scheduled: !!recordForLevel.scheduleSession2, date: recordForLevel.session2 || recordForLevel.scheduleSession2 },
            { name: "Coaching Session 3", key: "session3", completed: !!recordForLevel.session3, scheduled: !!recordForLevel.scheduleSession3, date: recordForLevel.session3 || recordForLevel.scheduleSession3 },
            { name: "Coach Awarded", key: "secureCareAwarded", completed: false, date: null }
          ],
          total: 5,
          completed: [!!recordForLevel.conferenceCompleted, !!recordForLevel.session1, !!recordForLevel.session2, !!recordForLevel.session3].filter(Boolean).length,
          color: "text-teal-600",
          icon: TrendingUp,
          isAwarded: false,
          hasData: true
        };
      default:
        return { requirements: [], total: 0, completed: 0, color: "", icon: Users };
    }
  };

  const levels = useMemo(() => {
    const levelsArray = [
      { key: "care-partner", name: "Level 1", progress: getLevelProgress("care-partner") },
      { key: "associate", name: "Level 2", progress: getLevelProgress("associate") },
      { key: "champion", name: "Level 3", progress: getLevelProgress("champion") },
      { key: "consultant", name: "Consultant", progress: getLevelProgress("consultant") },
      { key: "coach", name: "Coach", progress: getLevelProgress("coach") }
    ];
    
    console.log('🔍 Levels Array:', levelsArray);
    return levelsArray;
  }, [awardTypeToRecord]);

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
    if (date && (scheduleTrainingAsync || scheduleTraining)) {
      try {
        if (scheduleTrainingAsync) {
          await scheduleTrainingAsync({ employeeId, requirementKey, date });
        } else {
          scheduleTraining({ employeeId, requirementKey, date });
        }
        
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
    if (completeTrainingAsync || completeTraining) {
      try {
        // Backend will handle copying scheduled date to completion date
        if (completeTrainingAsync) {
          await completeTrainingAsync({ employeeId, requirementKey });
        } else {
          completeTraining({ employeeId, requirementKey });
        }
        
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
    if (date && (rescheduleTrainingAsync || rescheduleTraining)) {
      try {
        if (rescheduleTrainingAsync) {
          await rescheduleTrainingAsync({ employeeId, requirementKey, date });
        } else {
          rescheduleTraining({ employeeId, requirementKey, date });
        }
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
        <DialogContent className="max-w-5xl modal-container p-0 overflow-hidden">
        <div className="modal-content p-0">
        <DialogHeader className="relative bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 p-6 text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
              <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                <User className="w-6 h-6" />
              </div>
              <span>
                Employee Details
              </span>
            </DialogTitle>
            <DialogDescription asChild>
              <p className="text-white/90 mt-2">
                View employee training progress and assignments (Read-only)
              </p>
            </DialogDescription>
          </div>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div 
              className="text-center"
            >
              <div className="relative">
                <div className="w-16 h-16 border-4 border-purple-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-purple-600 rounded-full"></div>
              </div>
              <p className="text-muted-foreground mt-4 text-lg">
                Loading employee data...
              </p>
            </div>
          </div>
        ) : (
        <div className="space-y-6 p-6">
          {/* Employee Info */}
          <div>
            <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-cyan-500/5"></div>
              <CardHeader className="relative z-10 pb-4">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      {currentEmployee.name || (employee as any).Employee}
                    </span>
                  </div>
                  <div>
                    <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0 px-3 py-1">
                      {(employee as any).staffRoll || (employee as any).staffRoles || 'N/A'}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 backdrop-blur-sm border border-white/20">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Building className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Facility</p>
                    <p className="text-sm font-semibold">{currentEmployee.facility || (employee as any).Facility}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 backdrop-blur-sm border border-white/20">
                  <div className="p-2 bg-green-100 rounded-full">
                    <MapPin className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Area</p>
                    <p className="text-sm font-semibold">{currentEmployee.area || (employee as any).Area}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 backdrop-blur-sm border border-white/20">
                  <div className="p-2 bg-purple-100 rounded-full">
                    <User className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Employee ID</p>
                    <p className="text-sm font-semibold">{(employee as any).employeeNumber || currentEmployee.employeeId}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Current Level Advisor and Notes Section - Only show for Level 2 and above */}
          {currentLevel !== 'care-partner' && (() => {
            const currentLevelState = levelStates[currentLevel];
            if (!currentLevelState) return null;
            
            const currentLevelData = levels.find(level => level.key === currentLevel);
            if (!currentLevelData) return null;
            
            return (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Advisor Assignment */}
                  <div>
                    <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white to-purple-50">
                      <ShineBorder
                        borderWidth={2}
                        duration={25}
                        shineColor={["#8b5cf6", "#a855f7", "#c084fc"]}
                        className="rounded-lg"
                      />
                      <CardHeader className="relative z-10">
                        <CardTitle className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full">
                            <UserCheck className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-purple-700 bg-clip-text text-transparent">
                            Advisor Assignment
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="relative z-10 space-y-4">
                        <div className="space-y-3">
                          <Label htmlFor={`advisor-select-${currentLevel}`} className="text-sm font-semibold text-gray-700">
                            Assigned Advisor
                          </Label>
                          <Select
                            value={currentLevelState.advisorId}
                            onValueChange={(value) => handleLevelAdvisorUpdate(currentLevel, value)}
                            disabled={currentLevelState.isUpdatingAdvisor}
                          >
                            <SelectTrigger className="w-full border-2 border-purple-200 focus:border-purple-500 transition-colors">
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
                          {currentLevelState.isUpdatingAdvisor && (
                            <div className="flex items-center gap-2 text-sm text-purple-600">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                              Updating advisor...
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Notes Section */}
                  <div>
                    <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white to-cyan-50">
                      <ShineBorder
                        borderWidth={2}
                        duration={25}
                        shineColor={["#06b6d4", "#0891b2", "#0e7490"]}
                        className="rounded-lg"
                      />
                      <CardHeader className="relative z-10">
                        <CardTitle className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-full">
                            <MessageSquare className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-lg font-bold bg-gradient-to-r from-cyan-600 to-cyan-700 bg-clip-text text-transparent">
                            Notes
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="relative z-10 space-y-4">
                        <div className="space-y-3">
                          <Label htmlFor={`notes-select-${currentLevel}`} className="text-sm font-semibold text-gray-700">
                            Employee Notes
                          </Label>
                          <Select
                            value={currentLevelState.notes}
                            onValueChange={(value) => handleLevelNotesUpdate(currentLevel, value)}
                            disabled={currentLevelState.isUpdatingNotes}
                          >
                            <SelectTrigger className="w-full border-2 border-cyan-200 focus:border-cyan-500 transition-colors">
                              <SelectValue placeholder="Select a note..." />
                            </SelectTrigger>
                            <SelectContent>
                              {NOTES_OPTIONS.filter(option => option.value !== '').map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {currentLevelState.isUpdatingNotes && (
                            <div className="flex items-center gap-2 text-sm text-cyan-600">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-600"></div>
                              Updating notes...
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Training Progress */}
          <div
          >
            <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white to-gray-50">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-cyan-500/5"></div>
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Training Progress
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10">
                <Tabs value={currentLevel} onValueChange={setCurrentLevel} className="space-y-6">
                  <div className="flex max-w-fit mx-auto border border-transparent rounded-full bg-white shadow-[0px_8px_30px_rgb(0,0,0,0.12)] px-8 py-4 items-center justify-center space-x-8 mb-8">
                    {levels.map((level, idx) => {
                      const isActive = currentLevel === level.key;
                      return (
                        <button
                          key={`level-${idx}`}
                          onClick={() => setCurrentLevel(level.key)}
                          className="relative items-center flex space-x-2 transition-all duration-300 group"
                        >
                          <div
                            className={cn(
                              "relative p-3 rounded-xl border-2 transition-all duration-300",
                              isActive 
                                ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/25" 
                                : "bg-white hover:bg-purple-50 border-purple-200 hover:border-purple-300"
                            )}
                          >
                            <span className={cn(
                              "block sm:hidden transition-colors duration-300",
                              isActive ? "text-white" : "text-purple-600"
                            )}>
                              <level.progress.icon className="w-5 h-5" />
                            </span>
                            <span className={cn(
                              "hidden sm:block text-sm font-semibold transition-colors duration-300",
                              isActive ? "text-white" : "text-purple-700"
                            )}>
                              {level.name}
                            </span>
                            
                            {/* Active indicator */}
                            {isActive && (
                              <div className="absolute inset-0 bg-white/20 rounded-xl" />
                            )}
                            
                            {/* Progress indicator - only show if level is awarded */}
                            {level.progress.isAwarded && (
                              <div
                                className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full border-2 border-white"
                              />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                {levels.map((level) => (
                  <TabsContent key={level.key} value={level.key} className="space-y-6">
                    <div 
                      className="flex items-center justify-between p-6 rounded-xl bg-gradient-to-r from-white to-gray-50 border border-gray-200"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="p-3 rounded-full bg-gradient-to-r from-purple-100 to-blue-100"
                        >
                          <level.progress.icon className={`w-6 h-6 ${level.progress.color}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-800">{level.name} Level</h3>
                          <p className="text-sm text-gray-600">
                            {level.progress.completed} of {level.progress.total} requirements completed
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32">
                          <Progress 
                            value={(level.progress.completed / level.progress.total) * 100} 
                            className="h-3 bg-gray-200"
                          />
                        </div>
                        <span 
                          className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
                        >
                          {Math.round((level.progress.completed / level.progress.total) * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {!level.progress.hasData ? (
                        <div 
                          className="text-center py-8 text-gray-500"
                        >
                          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                            <AlertCircle className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-lg font-medium">No data for this level</p>
                          <p className="text-sm">This employee has no {levelKeyToAwardType[currentLevel]} record. Data will appear here once the employee progresses to this level.</p>
                        </div>
                      ) : (
                        level.progress.requirements.map((req, index) => (
                          <div 
                            key={index} 
                            className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-white hover:shadow-md transition-all duration-300"
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-400 to-blue-400"
                              />
                              <span className="font-semibold text-gray-800">{req.name}</span>
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
          </div>

          {/* Action Buttons */}
          <div 
            className="flex gap-3 justify-end pt-6 border-t border-gray-200"
          >
            <div
            >
              <Button 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="px-6 py-2 border-2 border-gray-300 hover:border-gray-400 transition-colors"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
}
