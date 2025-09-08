import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Employee } from '@/context/AppContext';
import { trainingAPI } from '@/services/api';
import { getLevelFromTabKey } from '@/config/awardTypes';

interface EmployeeFilters {
  level?: string;
  facility?: string;
  area?: string;
  status?: string;
  jobTitle?: string;
  search?: string;
}

// Hook for paginated employee data using new view-based approach
export const useEmployees = (filters: EmployeeFilters, pageSize: number = 10) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when filters change (excluding search to prevent focus loss)
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.level, filters.facility, filters.area, filters.status, filters.jobTitle]);

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['employees', filters.level, currentPage, JSON.stringify(filters)],
    queryFn: async () => {
      const level = filters.level ? getLevelFromTabKey(filters.level) : 'all';
      return trainingAPI.getEmployeesByLevel(level, {
        ...filters,
        page: currentPage,
        limit: pageSize
      });
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const totalPages = data?.pagination?.totalPages || 0;
  const totalEmployees = data?.pagination?.totalEmployees || 0;

  return {
    employees: data?.employees || [],
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    totalPages,
    totalEmployees,
    refetch,
    isFetching,
    hasNextPage: currentPage < totalPages,
  };
};

// Hook for employee statistics (placeholder until API integration)
export const useEmployeeStats = (level?: string) => {
  return useQuery({
    queryKey: ['employee-stats', level],
    queryFn: async () => {
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        level1Completed: 0,
        level2Completed: 0,
        level3Completed: 0,
        consultantCompleted: 0,
        coachCompleted: 0,
      } as any;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};