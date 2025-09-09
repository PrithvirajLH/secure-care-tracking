import { useState, useEffect, useMemo } from 'react';
import { trainingAPI } from '@/services/api';

export interface AnalyticsFilters {
  facility?: string;
  area?: string;
  level?: string;
  startDate?: string;
  endDate?: string;
}

export interface AnalyticsOverview {
  totalEmployees: number;
  completedCertifications: number;
  inProgress: number;
  notStarted: number;
  level1Completed: number;
  level2Completed: number;
  level3Completed: number;
  consultantCompleted: number;
  coachCompleted: number;
  averageCompletionTime: number;
}

export interface FacilityPerformance {
  facility: string;
  total: number;
  completed: number;
  inProgress: number;
  completionRate: number;
  avgTime: number;
}

export interface AreaPerformance {
  area: string;
  total: number;
  completed: number;
  inProgress: number;
  completionRate: number;
}

export interface MonthlyTrend {
  month: string;
  completed: number;
  inProgress: number;
  new: number;
}

export interface CertificationProgress {
  level: string;
  completed: number;
  inProgress: number;
  target: number;
  efficiency: number;
  avgTime: number;
}

export interface RecentActivity {
  employee: string;
  facility: string;
  achievement: string;
  date: string;
  timeToComplete: number;
  performance: string;
}

export interface AnalyticsMetrics {
  activeTrainingSessions: number;
  overdueTraining: number;
  recentCompletions: number;
  trainingEfficiency: string;
}

export interface AnalyticsData {
  overview: AnalyticsOverview;
  facilityPerformance: FacilityPerformance[];
  areaPerformance: AreaPerformance[];
  monthlyTrends: MonthlyTrend[];
  certificationProgress: CertificationProgress[];
  recentActivity: RecentActivity[];
  metrics: AnalyticsMetrics;
}

export function useAnalytics(filters: AnalyticsFilters = {}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Build query parameters from filters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    if (filters.facility && filters.facility !== 'all') {
      params.append('facility', filters.facility);
    }
    if (filters.area && filters.area !== 'all') {
      params.append('area', filters.area);
    }
    if (filters.level && filters.level !== 'all') {
      params.append('level', filters.level);
    }
    if (filters.startDate) {
      params.append('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params.append('endDate', filters.endDate);
    }
    
    return params.toString();
  }, [filters]);

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all analytics data in parallel
      const [
        overviewData,
        facilityPerformanceData,
        areaPerformanceData,
        monthlyTrendsData,
        certificationProgressData,
        recentActivityData,
        metricsData
      ] = await Promise.all([
        trainingAPI.getAnalyticsOverview(filters),
        trainingAPI.getFacilityPerformance(filters),
        trainingAPI.getAreaPerformance(filters),
        trainingAPI.getMonthlyTrends(filters),
        trainingAPI.getCertificationProgress(filters),
        trainingAPI.getRecentActivity(filters),
        trainingAPI.getAnalyticsMetrics(filters)
      ]);

      setData({
        overview: overviewData,
        facilityPerformance: facilityPerformanceData,
        areaPerformance: areaPerformanceData,
        monthlyTrends: monthlyTrendsData,
        certificationProgress: certificationProgressData,
        recentActivity: recentActivityData,
        metrics: metricsData
      });
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [queryParams]);

  const refetch = () => {
    fetchAnalyticsData();
  };

  return {
    data,
    isLoading,
    error,
    refetch
  };
}

// Hook for individual analytics components
export function useAnalyticsOverview(filters: AnalyticsFilters = {}) {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    if (filters.facility && filters.facility !== 'all') {
      params.append('facility', filters.facility);
    }
    if (filters.area && filters.area !== 'all') {
      params.append('area', filters.area);
    }
    if (filters.level && filters.level !== 'all') {
      params.append('level', filters.level);
    }
    if (filters.startDate) {
      params.append('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params.append('endDate', filters.endDate);
    }
    
    return params.toString();
  }, [filters]);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await trainingAPI.getAnalyticsOverview(filters);
        setData(data);
      } catch (err) {
        console.error('Error fetching analytics overview:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch analytics overview');
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
  }, [queryParams]);

  return { data, isLoading, error };
}

export function useFacilityPerformance(filters: AnalyticsFilters = {}) {
  const [data, setData] = useState<FacilityPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    if (filters.level && filters.level !== 'all') {
      params.append('level', filters.level);
    }
    if (filters.startDate) {
      params.append('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params.append('endDate', filters.endDate);
    }
    
    return params.toString();
  }, [filters]);

  useEffect(() => {
    const fetchFacilityPerformance = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await trainingAPI.getFacilityPerformance(filters);
        setData(data);
      } catch (err) {
        console.error('Error fetching facility performance:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch facility performance');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFacilityPerformance();
  }, [queryParams]);

  return { data, isLoading, error };
}

export function useMonthlyTrends(filters: AnalyticsFilters = {}) {
  const [data, setData] = useState<MonthlyTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    
    if (filters.facility && filters.facility !== 'all') {
      params.append('facility', filters.facility);
    }
    if (filters.area && filters.area !== 'all') {
      params.append('area', filters.area);
    }
    if (filters.level && filters.level !== 'all') {
      params.append('level', filters.level);
    }
    
    return params.toString();
  }, [filters]);

  useEffect(() => {
    const fetchMonthlyTrends = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await trainingAPI.getMonthlyTrends(filters);
        setData(data);
      } catch (err) {
        console.error('Error fetching monthly trends:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch monthly trends');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonthlyTrends();
  }, [queryParams]);

  return { data, isLoading, error };
}
