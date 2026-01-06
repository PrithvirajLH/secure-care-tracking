import { useQuery } from '@tanstack/react-query';
import { trainingAPI } from '@/services/api';

/**
 * Hook to check if current user has permission to edit completed dates
 */
export function useEditCompletedDatePermission() {
  return useQuery({
    queryKey: ['permissions', 'edit-completed-date'],
    queryFn: () => trainingAPI.checkEditCompletedDatePermission(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}

