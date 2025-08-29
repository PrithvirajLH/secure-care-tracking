import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { trainingAPI, TrainingUpdate } from '../services/api';
import { toast } from 'sonner';

// Query keys for React Query
export const trainingKeys = {
  all: ['training'] as const,
  employee: (employeeId: string) => [...trainingKeys.all, 'employee', employeeId] as const,
  allEmployees: () => [...trainingKeys.all, 'employees'] as const,
};

// Custom hook for managing training data
export const useTrainingData = () => {
  const queryClient = useQueryClient();

  // Get all training data
  const {
    data: allTrainingData,
    isLoading: isLoadingAll,
    error: allTrainingError,
  } = useQuery({
    queryKey: trainingKeys.allEmployees(),
    queryFn: trainingAPI.getAllTrainingData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get training data for a specific employee
  const useEmployeeTrainingData = (employeeId: string) => {
    return useQuery({
      queryKey: trainingKeys.employee(employeeId),
      queryFn: () => trainingAPI.getEmployeeTrainingData(employeeId),
      enabled: !!employeeId,
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Schedule training mutation
  const scheduleTrainingMutation = useMutation({
    mutationFn: ({ employeeId, requirementKey, date }: { employeeId: string; requirementKey: string; date: Date }) =>
      trainingAPI.scheduleTraining(employeeId, requirementKey, date),
    onSuccess: (data, variables) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: trainingKeys.employee(variables.employeeId) });
      queryClient.invalidateQueries({ queryKey: trainingKeys.allEmployees() });
      
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
    mutationFn: ({ employeeId, requirementKey, date }: { employeeId: string; requirementKey: string; date: Date }) =>
      trainingAPI.completeTraining(employeeId, requirementKey, date),
    onSuccess: (data, variables) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: trainingKeys.employee(variables.employeeId) });
      queryClient.invalidateQueries({ queryKey: trainingKeys.allEmployees() });
      
      toast.success('Training marked as complete!', {
        description: `Completed on ${variables.date.toLocaleDateString()}`,
      });
    },
    onError: (error) => {
      toast.error('Failed to complete training', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  // Reschedule training mutation
  const rescheduleTrainingMutation = useMutation({
    mutationFn: ({ employeeId, requirementKey, date }: { employeeId: string; requirementKey: string; date: Date }) =>
      trainingAPI.rescheduleTraining(employeeId, requirementKey, date),
    onSuccess: (data, variables) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: trainingKeys.employee(variables.employeeId) });
      queryClient.invalidateQueries({ queryKey: trainingKeys.allEmployees() });
      
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

  // Award training mutation
  const awardTrainingMutation = useMutation({
    mutationFn: ({ employeeId, requirementKey, date }: { employeeId: string; requirementKey: string; date: Date }) =>
      trainingAPI.awardTraining(employeeId, requirementKey, date),
    onSuccess: (data, variables) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: trainingKeys.employee(variables.employeeId) });
      queryClient.invalidateQueries({ queryKey: trainingKeys.allEmployees() });
      
      toast.success('Level awarded successfully!', {
        description: `Awarded on ${variables.date.toLocaleDateString()}`,
      });
    },
    onError: (error) => {
      toast.error('Failed to award level', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  // Generic update mutation
  const updateTrainingMutation = useMutation({
    mutationFn: (update: TrainingUpdate) => trainingAPI.updateTrainingData(update),
    onSuccess: (data, variables) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: trainingKeys.employee(variables.employeeId) });
      queryClient.invalidateQueries({ queryKey: trainingKeys.allEmployees() });
      
      toast.success('Training data updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update training data', {
        description: error instanceof Error ? error.message : 'An error occurred',
      });
    },
  });

  return {
    // Data
    allTrainingData,
    isLoadingAll,
    allTrainingError,
    
    // Hooks
    useEmployeeTrainingData,
    
    // Mutations
    scheduleTraining: scheduleTrainingMutation.mutate,
    completeTraining: completeTrainingMutation.mutate,
    rescheduleTraining: rescheduleTrainingMutation.mutate,
    awardTraining: awardTrainingMutation.mutate,
    updateTraining: updateTrainingMutation.mutate,
    
    // Loading states
    isScheduling: scheduleTrainingMutation.isPending,
    isCompleting: completeTrainingMutation.isPending,
    isRescheduling: rescheduleTrainingMutation.isPending,
    isAwarding: awardTrainingMutation.isPending,
    isUpdating: updateTrainingMutation.isPending,
    
    // Error states
    scheduleError: scheduleTrainingMutation.error,
    completeError: completeTrainingMutation.error,
    rescheduleError: rescheduleTrainingMutation.error,
    awardError: awardTrainingMutation.error,
    updateError: updateTrainingMutation.error,
  };
};
