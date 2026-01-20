import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Employee } from '@/context/AppContext';
import { trainingAPI, type EmployeeResponse } from '@/services/api';
import { getLevelFromTabKey } from '@/config/awardTypes';

interface EmployeeFilters {
  level?: string;
  facility?: string | string[];
  area?: string;
  status?: string;
  jobTitle?: string;
  search?: string;
  // Server-side date filtering
  dateField?: string;
  date?: string; // YYYY-MM-DD
  // Server-side sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Hook for paginated employee data using new view-based approach (unique employees only)
export const useEmployees = (filters: EmployeeFilters, pageSize: number = 10) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when filters change (excluding search to prevent focus loss)
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.level, filters.facility, filters.area, filters.status, filters.jobTitle, filters.sortBy, filters.sortOrder]);

  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useQuery<EmployeeResponse>({
    queryKey: ['employees-unique', filters.level, currentPage, JSON.stringify(filters)],
    queryFn: async () => {
      const level = filters.level && filters.level !== 'all' ? getLevelFromTabKey(filters.level) : 'all';
      return trainingAPI.getUniqueEmployeesByLevel(level, {
        ...filters,
        page: currentPage,
        limit: pageSize
      });
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const totalPages = data?.pagination?.totalPages || 0;
  const totalEmployees = data?.pagination?.totalEmployees || 0;

  // Prefetch next page for smoother UX
  useEffect(() => {
    if (!data?.pagination) return;
    if (currentPage < (data.pagination.totalPages || 0)) {
      const nextPage = currentPage + 1;
      const level = filters.level && filters.level !== 'all' ? getLevelFromTabKey(filters.level) : 'all';
      queryClient.prefetchQuery({
        queryKey: ['employees-unique', filters.level, nextPage, JSON.stringify(filters)],
        queryFn: () => trainingAPI.getUniqueEmployeesByLevel(level, { ...filters, page: nextPage, limit: pageSize }),
        staleTime: 3 * 60 * 1000,
      });
    }
  }, [data?.pagination, currentPage, filters, pageSize, queryClient]);

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

// Hook for training page - shows all employees for a specific level (including completed)
export const useTrainingEmployees = (filters: EmployeeFilters, pageSize: number = 10) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when filters change (excluding search to prevent focus loss)
  useEffect(() => {
    setCurrentPage(1);
  }, [filters.level, filters.facility, filters.area, filters.status, filters.jobTitle, filters.sortBy, filters.sortOrder]);

  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useQuery<EmployeeResponse>({
    queryKey: ['employees-training', filters.level, currentPage, JSON.stringify(filters)],
    queryFn: async () => {
      const level = filters.level && filters.level !== 'all' ? getLevelFromTabKey(filters.level) : 'all';
      return trainingAPI.getEmployeesByLevel(level, {
        ...filters,
        page: currentPage,
        limit: pageSize
      });
    },
    staleTime: 30 * 1000, // 30 seconds - balance between freshness and performance
    gcTime: 10 * 60 * 1000,
    refetchOnMount: false, // Don't refetch on mount if data is fresh
    refetchOnWindowFocus: false, // Don't refetch on window focus
    placeholderData: (prev) => prev,
  });

  const totalPages = data?.pagination?.totalPages || 0;
  const totalEmployees = data?.pagination?.totalEmployees || 0;

  // Prefetch next page
  useEffect(() => {
    if (!data?.pagination) return;
    if (currentPage < (data.pagination.totalPages || 0)) {
      const nextPage = currentPage + 1;
      const level = filters.level && filters.level !== 'all' ? getLevelFromTabKey(filters.level) : 'all';
      queryClient.prefetchQuery({
        queryKey: ['employees-training', filters.level, nextPage, JSON.stringify(filters)],
        queryFn: () => trainingAPI.getEmployeesByLevel(level, { ...filters, page: nextPage, limit: pageSize }),
        staleTime: 3 * 60 * 1000,
      });
    }
  }, [data?.pagination, currentPage, filters, pageSize, queryClient]);

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

// Hook for advisors data
export const useAdvisors = () => {
  return useQuery({
    queryKey: ['advisors'],
    queryFn: () => trainingAPI.getAdvisors(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};
