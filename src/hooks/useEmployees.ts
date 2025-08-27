import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Employee } from '@/context/AppContext';

interface EmployeeFilters {
  level?: string;
  facility?: string;
  area?: string;
  status?: string;
  search?: string;
}

interface PaginationParams {
  page: number;
  limit: number;
  filters: EmployeeFilters;
}

interface EmployeeResponse {
  employees: Employee[];
  total: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
}

// Mock data generator for testing - simplified to match existing Employee type
const generateMockEmployees = (count: number = 15000): Employee[] => {
  const facilities = ['Main Hospital', 'North Clinic', 'South Center', 'East Wing', 'West Facility'];
  const areas = ['Emergency', 'ICU', 'Pediatrics', 'Surgery', 'Cardiology', 'Neurology', 'Oncology'];
  const staffRoles = ['Nurse', 'Doctor', 'Technician', 'Therapist', 'Administrator'];
  const names = [
    'John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis', 'David Wilson',
    'Lisa Anderson', 'James Taylor', 'Jennifer Martinez', 'Robert Garcia', 'Amanda Rodriguez',
    'Christopher Lee', 'Michelle White', 'Daniel Thompson', 'Jessica Clark', 'Matthew Lewis',
    'Ashley Hall', 'Joshua Allen', 'Stephanie Young', 'Andrew King', 'Nicole Wright',
    'Kevin Scott', 'Rebecca Green', 'Brian Baker', 'Laura Adams', 'Steven Nelson',
    'Rachel Carter', 'Timothy Mitchell', 'Heather Perez', 'Jeffrey Roberts', 'Melissa Turner'
  ];

  return Array.from({ length: count }, (_, index) => {
    const employeeId = `EMP${String(index + 1).padStart(6, '0')}`;
    const name = names[index % names.length];
    const facility = facilities[index % facilities.length];
    const area = areas[index % areas.length];
    const staffRole = staffRoles[index % staffRoles.length];
    
    // Generate random training progress
    const level1Awarded = Math.random() > 0.3;
    const level2Awarded = level1Awarded && Math.random() > 0.4;
    const level3Awarded = level2Awarded && Math.random() > 0.5;
    const consultantAwarded = level3Awarded && Math.random() > 0.6;
    const coachAwarded = consultantAwarded && Math.random() > 0.7;

    return {
      employeeId,
      name: `${name} ${index + 1}`,
      facility,
      area,
      staffRoles: staffRole,
      level1ReliasAssigned: level1Awarded ? new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) : null,
      level1ReliasCompleted: level1Awarded ? new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000) : null,
      level1ConferenceCompleted: level1Awarded ? new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000) : null,
      level1Awarded,
      level1AwardedDate: level1Awarded ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
      level1Notes: '',
      level1Advisor: '',
      level1AwaitingRelias: null,
      level2ReliasAssigned: level2Awarded ? new Date(Date.now() - Math.random() * 80 * 24 * 60 * 60 * 1000) : null,
      level2ReliasCompleted: level2Awarded ? new Date(Date.now() - Math.random() * 50 * 24 * 60 * 60 * 1000) : null,
      level2ConferenceCompleted: level2Awarded ? new Date(Date.now() - Math.random() * 40 * 24 * 60 * 60 * 1000) : null,
      level2StandingVideo: level2Awarded ? new Date(Date.now() - Math.random() * 35 * 24 * 60 * 60 * 1000) : null,
      level2SleepingSittingVideo: level2Awarded ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
      level2FeedingVideo: level2Awarded ? new Date(Date.now() - Math.random() * 25 * 24 * 60 * 60 * 1000) : null,
      level2Awarded,
      level2AwardedDate: level2Awarded ? new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000) : null,
      level2Notes: '',
      level2Advisor: '',
      level2AwaitingRelias: null,
      level3ReliasAssigned: level3Awarded ? new Date(Date.now() - Math.random() * 70 * 24 * 60 * 60 * 1000) : null,
      level3ReliasCompleted: level3Awarded ? new Date(Date.now() - Math.random() * 40 * 24 * 60 * 60 * 1000) : null,
      level3ConferenceCompleted: level3Awarded ? new Date(Date.now() - Math.random() * 35 * 24 * 60 * 60 * 1000) : null,
      level3SittingStandingApproaching: level3Awarded ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
      level3NoHandNoSpeak: level3Awarded ? new Date(Date.now() - Math.random() * 25 * 24 * 60 * 60 * 1000) : null,
      level3ChallengeSleeping: level3Awarded ? new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000) : null,
      level3Awarded,
      level3AwardedDate: level3Awarded ? new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000) : null,
      level3Notes: '',
      level3Advisor: '',
      level3AwaitingRelias: null,
      consultantReliasAssigned: consultantAwarded ? new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000) : null,
      consultantReliasCompleted: consultantAwarded ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
      consultantConferenceCompleted: consultantAwarded ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
      consultantCoachingSession1: consultantAwarded ? new Date(Date.now() - Math.random() * 25 * 24 * 60 * 60 * 1000) : null,
      consultantCoachingSession2: consultantAwarded ? new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000) : null,
      consultantCoachingSession3: consultantAwarded ? new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000) : null,
      consultantAwarded,
      consultantAwardedDate: consultantAwarded ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000) : null,
      consultantNotes: '',
      consultantAdvisor: '',
      consultantAwaitingRelias: null,
      coachReliasAssigned: coachAwarded ? new Date(Date.now() - Math.random() * 50 * 24 * 60 * 60 * 1000) : null,
      coachReliasCompleted: coachAwarded ? new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000) : null,
      coachConferenceCompleted: coachAwarded ? new Date(Date.now() - Math.random() * 25 * 24 * 60 * 60 * 1000) : null,
      coachCoachingSession1: coachAwarded ? new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000) : null,
      coachCoachingSession2: coachAwarded ? new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000) : null,
      coachCoachingSession3: coachAwarded ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000) : null,
      coachAwarded,
      coachAwardedDate: coachAwarded ? new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000) : null,
      coachNotes: '',
      coachAdvisor: '',
      coachAwaitingRelias: null,
    };
  });
};

// Generate mock data once
const MOCK_EMPLOYEES = generateMockEmployees(15000); // 15K active employees

// Mock API function for fetching employees with pagination
const fetchEmployees = async ({ page, limit, filters }: PaginationParams): Promise<EmployeeResponse> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

  let filteredEmployees = [...MOCK_EMPLOYEES];

  // Apply filters
  if (filters.level) {
    switch (filters.level) {
      case 'care-partner':
        // All employees are eligible for Level 1
        break;
      case 'associate':
        filteredEmployees = filteredEmployees.filter(e => e.level1Awarded);
        break;
      case 'champion':
        filteredEmployees = filteredEmployees.filter(e => e.level2Awarded);
        break;
      case 'consultant':
        filteredEmployees = filteredEmployees.filter(e => e.level3Awarded);
        break;
      case 'coach':
        filteredEmployees = filteredEmployees.filter(e => e.consultantAwarded);
        break;
    }
  }

  if (filters.facility) {
    filteredEmployees = filteredEmployees.filter(e => 
      e.facility.toLowerCase().includes(filters.facility!.toLowerCase())
    );
  }

  if (filters.area) {
    filteredEmployees = filteredEmployees.filter(e => 
      e.area.toLowerCase().includes(filters.area!.toLowerCase())
    );
  }

  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filteredEmployees = filteredEmployees.filter(e => 
      e.name.toLowerCase().includes(searchTerm) || 
      e.employeeId.toLowerCase().includes(searchTerm)
    );
  }

  const total = filteredEmployees.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  return {
    employees: paginatedEmployees,
    total,
    page,
    totalPages,
    hasNextPage: page < totalPages,
  };
};

// Hook for paginated employee data
export const useEmployees = (filters: EmployeeFilters, pageSize: number = 50) => {
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['employees', currentPage, filters],
    queryFn: () => fetchEmployees({ page: currentPage, limit: pageSize, filters }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const totalPages = data?.totalPages || 0;
  const totalEmployees = data?.total || 0;

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
    hasNextPage: data?.hasNextPage || false,
  };
};

// Hook for employee statistics (cached separately)
export const useEmployeeStats = (level?: string) => {
  return useQuery({
    queryKey: ['employee-stats', level],
    queryFn: async () => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

      let filteredEmployees = [...MOCK_EMPLOYEES];

      if (level) {
        switch (level) {
          case 'care-partner':
            return {
              total: filteredEmployees.length,
              completed: filteredEmployees.filter(e => e.level1Awarded).length,
              inProgress: filteredEmployees.filter(e => e.level1ReliasAssigned && !e.level1ReliasCompleted).length,
              pending: filteredEmployees.filter(e => !e.level1ReliasAssigned).length,
              overdue: filteredEmployees.filter(e => 
                e.level1ReliasAssigned && 
                !e.level1ReliasCompleted && 
                new Date(e.level1ReliasAssigned.getTime() + 30 * 24 * 60 * 60 * 1000) < new Date()
              ).length,
              completionRate: Math.round((filteredEmployees.filter(e => e.level1Awarded).length / filteredEmployees.length) * 100)
            };
          case 'associate':
            const level1Completed = filteredEmployees.filter(e => e.level1Awarded);
            return {
              total: level1Completed.length,
              completed: level1Completed.filter(e => e.level2Awarded).length,
              inProgress: level1Completed.filter(e => e.level2ReliasAssigned && !e.level2ReliasCompleted).length,
              pending: level1Completed.filter(e => !e.level2ReliasAssigned).length,
              overdue: level1Completed.filter(e => 
                e.level2ReliasAssigned && 
                !e.level2ReliasCompleted && 
                new Date(e.level2ReliasAssigned.getTime() + 45 * 24 * 60 * 60 * 1000) < new Date()
              ).length,
              completionRate: Math.round((level1Completed.filter(e => e.level2Awarded).length / level1Completed.length) * 100)
            };
          case 'champion':
            const level2Completed = filteredEmployees.filter(e => e.level2Awarded);
            return {
              total: level2Completed.length,
              completed: level2Completed.filter(e => e.level3Awarded).length,
              inProgress: level2Completed.filter(e => e.level3ReliasAssigned && !e.level3ReliasCompleted).length,
              pending: level2Completed.filter(e => !e.level3ReliasAssigned).length,
              overdue: level2Completed.filter(e => 
                e.level3ReliasAssigned && 
                !e.level3ReliasCompleted && 
                new Date(e.level3ReliasAssigned.getTime() + 60 * 24 * 60 * 60 * 1000) < new Date()
              ).length,
              completionRate: Math.round((level2Completed.filter(e => e.level3Awarded).length / level2Completed.length) * 100)
            };
          case 'consultant':
            const level3Completed = filteredEmployees.filter(e => e.level3Awarded);
            return {
              total: level3Completed.length,
              completed: level3Completed.filter(e => e.consultantAwarded).length,
              inProgress: level3Completed.filter(e => e.consultantReliasAssigned && !e.consultantReliasCompleted).length,
              pending: level3Completed.filter(e => !e.consultantReliasAssigned).length,
              overdue: level3Completed.filter(e => 
                e.consultantReliasAssigned && 
                !e.consultantReliasCompleted && 
                new Date(e.consultantReliasAssigned.getTime() + 90 * 24 * 60 * 60 * 1000) < new Date()
              ).length,
              completionRate: Math.round((level3Completed.filter(e => e.consultantAwarded).length / level3Completed.length) * 100)
            };
          case 'coach':
            const consultantCompleted = filteredEmployees.filter(e => e.consultantAwarded);
            return {
              total: consultantCompleted.length,
              completed: consultantCompleted.filter(e => e.coachAwarded).length,
              inProgress: consultantCompleted.filter(e => e.coachReliasAssigned && !e.coachReliasCompleted).length,
              pending: consultantCompleted.filter(e => !e.coachReliasAssigned).length,
              overdue: consultantCompleted.filter(e => 
                e.coachReliasAssigned && 
                !e.coachReliasCompleted && 
                new Date(e.coachReliasAssigned.getTime() + 120 * 24 * 60 * 60 * 1000) < new Date()
              ).length,
              completionRate: Math.round((consultantCompleted.filter(e => e.coachAwarded).length / consultantCompleted.length) * 100)
            };
          default:
            return {
              total: 0,
              completed: 0,
              inProgress: 0,
              pending: 0,
              overdue: 0,
              completionRate: 0
            };
        }
      } else {
        // Overall stats
        return {
          totalEmployees: filteredEmployees.length,
          activeEmployees: filteredEmployees.length, // All are active in mock data
          level1Completed: filteredEmployees.filter(e => e.level1Awarded).length,
          level2Completed: filteredEmployees.filter(e => e.level2Awarded).length,
          level3Completed: filteredEmployees.filter(e => e.level3Awarded).length,
          consultantCompleted: filteredEmployees.filter(e => e.consultantAwarded).length,
          coachCompleted: filteredEmployees.filter(e => e.coachAwarded).length
        };
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};
