import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Employee } from '@/context/AppContext';

interface EmployeeFilters {
  level?: string;
  facility?: string;
  area?: string;
  status?: string;
  jobTitle?: string;
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
const generateMockEmployees = (count: number = 10): Employee[] => {
  const facilities = [
    'Afton Oaks Nursing and Rehabilitation Center', 'Alvarado Meadows Nursing and Rehab', 'Amarillo Skilled Care', 'Amistad', 'Arboretum of Winnie',
    'Arlington Heights', 'Atrium of Bellmead', 'Avalon Place Kirbyville', 'Ballinger Healthcare', 'Beaumont Nursing',
    'Beltline Healthcare Center', 'Bertram Nursing', 'Big Spring', 'Birchwood Nursing', 'Bluebonnet Nursing',
    'Bluebonnet Point Wellness', 'Brentwood Terrace', 'Brownwood', 'Buena Vida Odessa', 'Buena Vida San Antonio',
    'Caprock', 'Care Nursing', 'Castle Pines', 'Cedar Creek', 'Cedar Manor', 'Central Texas',
    'Chatfield', 'Cherokee Rose', 'Chisolm Trail Nursing and Rehabilitation Center', 'Concho Health and Rehab', 'Copperas Hollow Assisted Living',
    'Copperas Hollow Nursing and Rehab', 'Cottonwood', 'Country View Nursing', 'Crossroads', 'Deerings', 'Deleon',
    'Desoto Nursing and Rehabilitation Center', 'Devine', 'Dogwood', 'Downtown', 'Eagle Pass', 'El Paso Health and Rehab',
    'Estates Healthcare', 'Fair Park Health & Rehabilitation Center', 'Fairfield', 'Five Points Amarillo', 'Five Points Desoto',
    'Five Points of College Station', 'Five Points of Lake Highlands', 'Five Points of Pflugerville', 'Fortress', 'Fountains of Tyler',
    'Franklin', 'Franklin Heights', 'Ganado', 'Georgia Manor', 'Gilmer Nursing', 'Grace Pointe Wellness Center',
    'Graham Oaks', 'Granbury Care', 'Great Plains', 'Greenbrier of Tyler', 'Greenbrier Palestine',
    'Greenhill Villas', 'Heritage House', 'Heritage House of Marshall', 'Heritage Place of Decatur', 'Hillcrest Manor Nursing and Rehabilitation',
    'Hills Nursing', 'Honey Grove Nursing Center', 'Huebner Creek', 'Interlochen', 'Kemp Care Center',
    'Kenedy', 'Kerens Care Center', 'La Bahia Nursing', 'La Hacienda', 'La Vida Serena',
    'Lake Lodge', 'Lampasas Nursing and Rehabilitation Center', 'Lampstand', 'Lancaster Nursing and Rehabilitation', 'Landmark of Amarillo Rehab and Nursing',
    'Landmark of Plano Rehab and Nursing', 'Legacy at Corsicana Rehabilitation and Healthcare', 'Legacy at Jacksonville', 'Longmeadow', 'Longview',
    'Lubbock Health', 'Madisonville', 'Madisonville Assisted Living', 'Marine Creek Nursing', 'Matagorda',
    'McLean Care', 'Memphis Convalescent', 'Mesa Vista', 'Mexia Skilled Care', 'Mineral Wells',
    'Mission Ridge Nursing', 'Mount Pleasant ALF', 'Mountain View', 'Mullican Care Center', 'Navasota Nursing',
    'Normandy Terrace', 'North Park', 'North Pointe', 'Oak Ridge Manor', 'Oakmont of Humble',
    'Oakmont of Katy', 'Oaks at Granbury', 'Oasis', 'Park Highlands', 'Park Place Care Center',
    'Park Plaza', 'Parkview Manor Nursing and Rehab', 'Peach Tree', 'Pebble Creek', 'Pecan Tree Rehab and Health Care Center',
    'Pine Tree Lodge', 'Pleasant Springs', 'Premier Memory Care of Alice', 'Premier SNF of Alice', 'River City Care Center',
    'River Oaks Nursing and Rehabilitation Center', 'Rock Creek', 'Rockwall Nursing Care Center', 'San Saba', 'Seven Oaks Nursing',
    'Shady Oak', 'Shiner', 'Sienna', 'Silver Tree', 'Slaton Care Center', 'Songbird',
    'Southern Specialty', 'St Giles', 'St Teresa Nursing and Rehab', 'Sunflower Park', 'Texoma',
    'The Arbors', 'The Homestead Assisted Living', 'The Park', 'The Plaza at Richardson', 'The Rio at Mission Trails',
    'The Village at Heritage Oaks', 'The Village at Heritage Oaks - Alf', 'Treemont Healthcare', 'Turner Park', 'Twilight',
    'Twin Oaks', 'Twin Pines', 'Twin Pines North', 'University Park Nursing', 'University Rehabilitation Center',
    'Vidor', 'Villa of Toscana', 'Villa of Wolfforth', 'Vintage Assisted Living of Denton', 'Vintage Health Care Center',
    'Vista Hills', 'Wellington Care', 'Westward Trails', 'Whispering Pines Lodge', 'Whisperwood',
    'Whitesboro Health & Rehabilitation Center', 'Winnie L Nursing And Rehab', 'Yorktown Nursing & Rehabilitation Center'
  ];
  const areas = ['Area 1', 'Area 2', 'Area 3', 'Area 4', 'Area 5', 'Area 6', 'Area 7', 'Area 8', 'Area 9', 'Area 10', 'Area 11', 'Area 12', 'Area 13', 'Area 14', 'Area 15', 'Area 16'];
  const staffRoles = ['Nurse', 'Doctor', 'Technician', 'Therapist', 'Administrator'];
  const names = [
    'John Smith', 'Sarah Johnson', 'Michael Brown', 'Emily Davis', 'David Wilson',
    'Lisa Anderson', 'James Taylor', 'Jennifer Martinez', 'Robert Garcia', 'Amanda Rodriguez',
    'Christopher Lee', 'Michelle White', 'Daniel Thompson', 'Jessica Clark', 'Matthew Lewis',
    'Ashley Hall', 'Joshua Allen', 'Stephanie Young', 'Andrew King', 'Nicole Wright',
    'Kevin Scott', 'Rebecca Green', 'Brian Baker', 'Laura Adams', 'Steven Nelson',
    'Rachel Carter', 'Timothy Mitchell', 'Heather Perez', 'Jeffrey Roberts', 'Melissa Turner'
  ];

  // Create facility to area mapping for equal distribution
  // 168 facilities ÷ 16 areas = 10.5 facilities per area
  // We'll distribute 10 facilities to first 8 areas and 11 facilities to last 8 areas
  const facilityToAreaMapping: { [facility: string]: string } = {};
  let facilityIndex = 0;
  
  for (let areaIndex = 0; areaIndex < areas.length; areaIndex++) {
    const facilitiesPerArea = areaIndex < 8 ? 10 : 11; // First 8 areas get 10, last 8 get 11
    for (let i = 0; i < facilitiesPerArea && facilityIndex < facilities.length; i++) {
      facilityToAreaMapping[facilities[facilityIndex]] = areas[areaIndex];
      facilityIndex++;
    }
  }

  return Array.from({ length: count }, (_, index) => {
    const employeeId = `EMP${String(index + 1).padStart(6, '0')}`;
    const name = names[index % names.length];
    
    // Distribute employees equally among facilities
    const facilityIndex = index % facilities.length;
    const facility = facilities[facilityIndex];
    
    // Get area from facility mapping
    const area = facilityToAreaMapping[facility] || areas[0];
    
    const staffRole = staffRoles[index % staffRoles.length];
    
         // Generate more realistic training progress with various stages
     const level1Progress = Math.random();
     const level1Awarded = level1Progress > 0.7; // 30% completed Level 1
     const level1InProgress = level1Progress > 0.3 && level1Progress <= 0.7; // 40% in progress
     
     const level2Progress = level1Awarded ? Math.random() : 0;
     const level2Awarded = level2Progress > 0.6; // 40% of Level 1 graduates complete Level 2
     const level2InProgress = level2Progress > 0.2 && level2Progress <= 0.6; // 40% in progress
     
     const level3Progress = level2Awarded ? Math.random() : 0;
     const level3Awarded = level3Progress > 0.5; // 50% of Level 2 graduates complete Level 3
     const level3InProgress = level3Progress > 0.1 && level3Progress <= 0.5; // 40% in progress
     
     const consultantProgress = level3Awarded ? Math.random() : 0;
     const consultantAwarded = consultantProgress > 0.4; // 60% of Level 3 graduates complete Consultant
     const consultantInProgress = consultantProgress > 0.1 && consultantProgress <= 0.4; // 30% in progress
     
     const coachProgress = consultantAwarded ? Math.random() : 0;
     const coachAwarded = coachProgress > 0.3; // 70% of Consultant graduates complete Coach
     const coachInProgress = coachProgress > 0.1 && coachProgress <= 0.3; // 20% in progress

    return {
      employeeId,
      name: `${name} ${index + 1}`,
      facility,
      area,
      staffRoles: staffRole,
             level1ReliasAssigned: (level1Awarded || level1InProgress) ? new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) : null,
       level1ReliasCompleted: level1Awarded ? new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000) : (level1InProgress ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null),
       level1ConferenceCompleted: level1Awarded ? new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000) : (level1InProgress ? new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000) : null),
       level1Awarded,
       level1AwardedDate: level1Awarded ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
      level1Notes: '',
      level1Advisor: '',
      level1AwaitingRelias: null,
             level2ReliasAssigned: (level2Awarded || level2InProgress) ? new Date(Date.now() - Math.random() * 80 * 24 * 60 * 60 * 1000) : null,
       level2ReliasCompleted: level2Awarded ? new Date(Date.now() - Math.random() * 50 * 24 * 60 * 60 * 1000) : (level2InProgress ? new Date(Date.now() - Math.random() * 25 * 24 * 60 * 60 * 1000) : null),
       level2ConferenceCompleted: level2Awarded ? new Date(Date.now() - Math.random() * 40 * 24 * 60 * 60 * 1000) : (level2InProgress ? new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000) : null),
      level2StandingVideo: level2Awarded
        ? new Date(Date.now() - Math.random() * 35 * 24 * 60 * 60 * 1000)
        : (level2InProgress && ((index + 0) % 3 !== 0) ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000) : null),
      level2SleepingSittingVideo: level2Awarded
        ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        : (level2InProgress && ((index + 1) % 3 !== 0) ? new Date(Date.now() - Math.random() * 8 * 24 * 60 * 60 * 1000) : null),
      level2FeedingVideo: level2Awarded
        ? new Date(Date.now() - Math.random() * 25 * 24 * 60 * 60 * 1000)
        : (level2InProgress && ((index + 2) % 3 !== 0) ? new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000) : null),
       level2Awarded,
       level2AwardedDate: level2Awarded ? new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000) : null,
      level2Notes: '',
      level2Advisor: '',
      level2AwaitingRelias: null,
             level3ReliasAssigned: (level3Awarded || level3InProgress) ? new Date(Date.now() - Math.random() * 70 * 24 * 60 * 60 * 1000) : null,
       level3ReliasCompleted: level3Awarded ? new Date(Date.now() - Math.random() * 40 * 24 * 60 * 60 * 1000) : (level3InProgress ? new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000) : null),
       level3ConferenceCompleted: level3Awarded ? new Date(Date.now() - Math.random() * 35 * 24 * 60 * 60 * 1000) : (level3InProgress ? new Date(Date.now() - Math.random() * 12 * 24 * 60 * 60 * 1000) : null),
      level3SittingStandingApproaching: level3Awarded
        ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
        : (level3InProgress && ((index + 0) % 3 !== 0) ? new Date(Date.now() - Math.random() * 8 * 24 * 60 * 60 * 1000) : null),
      level3NoHandNoSpeak: level3Awarded
        ? new Date(Date.now() - Math.random() * 25 * 24 * 60 * 60 * 1000)
        : (level3InProgress && ((index + 1) % 3 !== 0) ? new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000) : null),
      level3ChallengeSleeping: level3Awarded
        ? new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000)
        : (level3InProgress && ((index + 2) % 3 !== 0) ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000) : null),
       level3Awarded,
       level3AwardedDate: level3Awarded ? new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000) : null,
      level3Notes: '',
      level3Advisor: '',
      level3AwaitingRelias: null,
             consultantReliasAssigned: (consultantAwarded || consultantInProgress) ? new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000) : null,
       consultantReliasCompleted: consultantAwarded ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : (consultantInProgress ? new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000) : null),
       consultantConferenceCompleted: consultantAwarded ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : (consultantInProgress ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000) : null),
       consultantCoachingSession1: consultantAwarded ? new Date(Date.now() - Math.random() * 25 * 24 * 60 * 60 * 1000) : (consultantInProgress ? new Date(Date.now() - Math.random() * 8 * 24 * 60 * 60 * 1000) : null),
       consultantCoachingSession2: consultantAwarded ? new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000) : (consultantInProgress ? new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000) : null),
       consultantCoachingSession3: consultantAwarded ? new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000) : (consultantInProgress ? new Date(Date.now() - Math.random() * 2 * 24 * 60 * 60 * 1000) : null),
       consultantAwarded,
       consultantAwardedDate: consultantAwarded ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000) : null,
      consultantNotes: '',
      consultantAdvisor: '',
      consultantAwaitingRelias: null,
             coachReliasAssigned: (coachAwarded || coachInProgress) ? new Date(Date.now() - Math.random() * 50 * 24 * 60 * 60 * 1000) : null,
       coachReliasCompleted: coachAwarded ? new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000) : (coachInProgress ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000) : null),
       coachConferenceCompleted: coachAwarded ? new Date(Date.now() - Math.random() * 25 * 24 * 60 * 60 * 1000) : (coachInProgress ? new Date(Date.now() - Math.random() * 8 * 24 * 60 * 60 * 1000) : null),
       coachCoachingSession1: coachAwarded ? new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000) : (coachInProgress ? new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000) : null),
       coachCoachingSession2: coachAwarded ? new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000) : (coachInProgress ? new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000) : null),
       coachCoachingSession3: coachAwarded ? new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000) : (coachInProgress ? new Date(Date.now() - Math.random() * 1 * 24 * 60 * 60 * 1000) : null),
       coachAwarded,
       coachAwardedDate: coachAwarded ? new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000) : null,
      coachNotes: '',
      coachAdvisor: '',
      coachAwaitingRelias: null,
    };
  });
};

// Generate mock data once
const MOCK_EMPLOYEES = generateMockEmployees(50); // 50 active employees for testing pagination

// Mock API function for fetching employees with pagination
const fetchEmployees = async ({ page, limit, filters }: PaginationParams): Promise<EmployeeResponse> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

  console.log('fetchEmployees: Received filters:', filters);
  console.log('fetchEmployees: Page:', page, 'Limit:', limit);
  console.log('fetchEmployees: Total mock employees:', MOCK_EMPLOYEES.length);

  let filteredEmployees = [...MOCK_EMPLOYEES];

  // Apply filters
  if (filters.level) {
    switch (filters.level) {
      case 'care-partner':
        // Show all employees who haven't completed Level 1 yet (including those in progress)
        filteredEmployees = filteredEmployees.filter(e => !e.level1Awarded);
        break;
      case 'associate':
        // Show employees who have completed Level 1 but haven't completed Level 2 yet
        filteredEmployees = filteredEmployees.filter(e => e.level1Awarded && !e.level2Awarded);
        break;
      case 'champion':
        // Show employees who have completed Level 2 but haven't completed Level 3 yet
        filteredEmployees = filteredEmployees.filter(e => e.level2Awarded && !e.level3Awarded);
        break;
      case 'consultant':
        // Show employees who have completed Level 3 but haven't completed Consultant yet
        filteredEmployees = filteredEmployees.filter(e => e.level3Awarded && !e.consultantAwarded);
        break;
      case 'coach':
        // Show employees who have completed Consultant but haven't completed Coach yet
        filteredEmployees = filteredEmployees.filter(e => e.consultantAwarded && !e.coachAwarded);
        break;
      default:
        // If no valid level is specified, show all employees
        console.warn('useEmployees: Invalid level filter:', filters.level);
        break;
    }
    
    console.log(`useEmployees: After level filtering (${filters.level}):`, filteredEmployees.length, 'employees');
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

  // Handle job title filter
  if (filters.jobTitle) {
    filteredEmployees = filteredEmployees.filter(e => 
      e.staffRoles === filters.jobTitle
    );
  }

  // Handle status filter (current training level)
  if (filters.status) {
    console.log('useEmployees: Applying status filter:', filters.status);
    
    if (filters.status === 'active') {
      // 'active' means show all employees (no filtering)
      console.log('useEmployees: Status is "active", showing all employees');
    } else {
      filteredEmployees = filteredEmployees.filter(e => {
        // Determine current level for status filtering
        if (e.coachReliasAssigned && !e.coachAwarded) return filters.status === "Coach In Progress";
        if (e.consultantReliasAssigned && !e.consultantAwarded) return filters.status === "Consultant In Progress";
        if (e.level3ReliasAssigned && !e.level3Awarded) return filters.status === "Level 3 In Progress";
        if (e.level2ReliasAssigned && !e.level2Awarded) return filters.status === "Level 2 In Progress";
        if (e.level1ReliasAssigned && !e.level1Awarded) return filters.status === "Level 1 In Progress";
        if (e.coachAwarded) return filters.status === "Coach";
        if (e.consultantAwarded) return filters.status === "Consultant";
        if (e.level3Awarded) return filters.status === "Level 3";
        if (e.level2Awarded) return filters.status === "Level 2";
        if (e.level1Awarded) return filters.status === "Level 1";
        return filters.status === "Not Started";
      });
    }
    
    console.log(`useEmployees: After status filtering: ${filteredEmployees.length} employees`);
  }

  const total = filteredEmployees.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  console.log(`fetchEmployees: Final result - Total: ${total}, Page: ${page}, TotalPages: ${totalPages}, Returned: ${paginatedEmployees.length}`);

  return {
    employees: paginatedEmployees,
    total,
    page,
    totalPages,
    hasNextPage: page < totalPages,
  };
};

// Hook for paginated employee data
export const useEmployees = (filters: EmployeeFilters, pageSize: number = 10) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when filters change
  useEffect(() => {
    console.log('useEmployees: Filters changed, resetting to page 1');
    setCurrentPage(1);
  }, [filters]);

  // Debug logging for page changes
  useEffect(() => {
    console.log('useEmployees: Page changed to:', currentPage);
  }, [currentPage]);

  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey: ['employees', currentPage, JSON.stringify(filters)],
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
