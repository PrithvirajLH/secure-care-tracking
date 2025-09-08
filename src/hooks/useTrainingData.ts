import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trainingAPI, TrainingUpdate } from '../services/api';
import { toast } from 'sonner';
import { ScheduleFieldMapping } from '@/config/awardTypes';

// Query keys for React Query
export const trainingKeys = {
  all: ['training'] as const,
  employee: (employeeId: string) => [...trainingKeys.all, 'employee', employeeId] as const,
  allEmployees: () => [...trainingKeys.all, 'employees'] as const,
  level: (level: string) => [...trainingKeys.all, 'level', level] as const,
};

// Custom hook for managing training data with new configuration
export const useTrainingData = () => {
  const queryClient = useQueryClient();

  // Get training data for a specific employee
  const useEmployeeTrainingData = (employeeId: string) => {
    return useQuery({
      queryKey: trainingKeys.employee(employeeId),
      queryFn: () => trainingAPI.getEmployeeById(employeeId),
      enabled: !!employeeId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Schedule training mutation
  const scheduleTrainingMutation = useMutation({
    mutationFn: ({ employeeId, requirementKey, date }: { employeeId: string; requirementKey: string; date: Date }) => {
      console.log('useTrainingData: Scheduling training for employee:', employeeId, 'requirement:', requirementKey, 'date:', date);
      
      // Map frontend requirement key to database column name
      let scheduleColumn = ScheduleFieldMapping[requirementKey] || `schedule${requirementKey}`;
      
      // Convert frontend field names to database column names for API calls
      if (scheduleColumn === 'scheduleSession1') scheduleColumn = 'scheduleSession#1';
      if (scheduleColumn === 'scheduleSession2') scheduleColumn = 'scheduleSession#2';
      if (scheduleColumn === 'scheduleSession3') scheduleColumn = 'scheduleSession#3';
      
      console.log('useTrainingData: Mapped to database column:', scheduleColumn);
      return trainingAPI.scheduleTraining(employeeId, scheduleColumn, date);
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: trainingKeys.employee(variables.employeeId) });
      queryClient.invalidateQueries({ queryKey: ['employee-levels', variables.employeeId] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'employees-unique' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'employees-training' });
      
      toast.success('Training scheduled successfully!', {
        description: `Scheduled for ${variables.date.toLocaleDateString()}`,
      });
    },
    onError: (error) => {
      toast.error('Failed to schedule training', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  // Complete training mutation
  const completeTrainingMutation = useMutation({
    mutationFn: ({ employeeId, requirementKey }: { employeeId: string; requirementKey: string; date?: Date }) => {
      let scheduleColumn = ScheduleFieldMapping[requirementKey] || `schedule${requirementKey}`;
      
      // Convert frontend field names to database column names for API calls
      if (scheduleColumn === 'scheduleSession1') scheduleColumn = 'scheduleSession#1';
      if (scheduleColumn === 'scheduleSession2') scheduleColumn = 'scheduleSession#2';
      if (scheduleColumn === 'scheduleSession3') scheduleColumn = 'scheduleSession#3';
      
      // Map frontend field names to database field names
      let completeColumn = requirementKey;
      if (requirementKey === 'session1') completeColumn = 'session#1';
      if (requirementKey === 'session2') completeColumn = 'session#2';
      if (requirementKey === 'session3') completeColumn = 'session#3';
      
      // Backend will handle copying the scheduled date to completion field
      return trainingAPI.completeTraining(employeeId, scheduleColumn, completeColumn);
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: trainingKeys.employee(variables.employeeId) });
      queryClient.invalidateQueries({ queryKey: ['employee-levels', variables.employeeId] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'employees-unique' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'employees-training' });
      
      toast.success('Training marked as complete!', {
        description: 'Completed using scheduled date',
      });
    },
    onError: (error) => {
      toast.error('Failed to complete training', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  // Reschedule training mutation (same as schedule)
  const rescheduleTrainingMutation = useMutation({
    mutationFn: ({ employeeId, requirementKey, date }: { employeeId: string; requirementKey: string; date: Date }) => {
      let scheduleColumn = ScheduleFieldMapping[requirementKey] || `schedule${requirementKey}`;
      
      // Convert frontend field names to database column names for API calls
      if (scheduleColumn === 'scheduleSession1') scheduleColumn = 'scheduleSession#1';
      if (scheduleColumn === 'scheduleSession2') scheduleColumn = 'scheduleSession#2';
      if (scheduleColumn === 'scheduleSession3') scheduleColumn = 'scheduleSession#3';
      
      return trainingAPI.rescheduleTraining(employeeId, scheduleColumn, date);
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: trainingKeys.employee(variables.employeeId) });
      queryClient.invalidateQueries({ queryKey: ['employee-levels', variables.employeeId] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'employees-unique' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'employees-training' });
      
      toast.success('Training rescheduled successfully!', {
        description: `Rescheduled for ${variables.date.toLocaleDateString()}`,
      });
    },
    onError: (error) => {
      toast.error('Failed to reschedule training', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  // Award training mutation (read-only for now)
  const awardTrainingMutation = useMutation({
    mutationFn: ({ employeeId, requirementKey, date }: { employeeId: string; requirementKey: string; date: Date }) => {
      throw new Error('Awards are read-only in this version');
    },
    onError: (error) => {
      toast.error('Awards are read-only', {
        description: 'Awards are managed automatically by the system',
      });
    },
  });

  // Conference approval (approve)
  const approveConferenceMutation = useMutation({
    mutationFn: ({ employeeId, notes }: { employeeId: string; notes?: string }) => {
      console.log('useTrainingData: Approving conference for employee:', employeeId);
      return trainingAPI.approveConference(employeeId, notes);
    },
    onSuccess: (data, variables) => {
      console.log('useTrainingData: Approve conference success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: trainingKeys.employee(variables.employeeId) });
      queryClient.invalidateQueries({ queryKey: ['employee-levels', variables.employeeId] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'employees-unique' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'employees-training' });
      toast.success('Conference approved successfully!');
    },
    onError: (error) => {
      toast.error('Failed to approve conference', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  // Conference approval (reject) - UI only
  const rejectConferenceMutation = useMutation({
    mutationFn: ({ employeeId, notes }: { employeeId: string; notes?: string }) => {
      console.log('useTrainingData: Rejecting conference for employee:', employeeId);
      return trainingAPI.rejectConference(employeeId, notes);
    },
    onSuccess: (data, variables) => {
      console.log('useTrainingData: Reject conference success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: trainingKeys.employee(variables.employeeId) });
      queryClient.invalidateQueries({ queryKey: ['employee-levels', variables.employeeId] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'employees-unique' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'employees-training' });
      toast.success('Conference rejected successfully!');
    },
    onError: (error) => {
      toast.error('Failed to reject conference', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  return {
    // Hooks
    useEmployeeTrainingData,
    
    // Mutations
    scheduleTraining: scheduleTrainingMutation.mutate,
    completeTraining: completeTrainingMutation.mutate,
    rescheduleTraining: rescheduleTrainingMutation.mutate,
    awardTraining: awardTrainingMutation.mutate,
    approveConference: approveConferenceMutation.mutate,
    rejectConference: rejectConferenceMutation.mutate,
    
    // Loading states
    isScheduling: scheduleTrainingMutation.isPending,
    isCompleting: completeTrainingMutation.isPending,
    isRescheduling: rescheduleTrainingMutation.isPending,
    isAwarding: awardTrainingMutation.isPending,
    isApprovingConference: approveConferenceMutation.isPending,
    isRejectingConference: rejectConferenceMutation.isPending,
    
    // Error states
    scheduleError: scheduleTrainingMutation.error,
    completeError: completeTrainingMutation.error,
    rescheduleError: rescheduleTrainingMutation.error,
    awardError: awardTrainingMutation.error,
  };
};