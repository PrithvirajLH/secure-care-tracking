import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-picker";
import { CompactPagination } from "@/components/ui/compact-pagination";
import { 
  Users, 
  Award, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  PlayCircle,
  Calendar,
  FileText,
  Video,
  GraduationCap,
  Star,
  TrendingUp,
  Filter,
  X
} from "lucide-react";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { toast } from "sonner";
import { useTrainingData } from "@/hooks/useTrainingData";
import EmployeeDetailModal from "@/components/EmployeeDetailModal";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { useEmployees, useEmployeeStats } from "@/hooks/useEmployees";
import PageHeader from "@/components/PageHeader";
import { trainingAPI } from "@/services/api";

// Import new configuration
import { 
  LevelColumns, 
  LevelFieldMapping, 
  ScheduleFieldMapping,
  fmt,
  parseDate,
  LevelConfig,
  getLevelFromTabKey,
  getTabKeyFromLevel,
  type AwardType 
} from "@/config/awardTypes";

interface LevelStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  completionRate: number;
}

export default function Training() {
  // URL-based tab persistence
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('level') || "level-1";
  });
  
  // Update URL when tab changes
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setSearchParams({ level: newTab });
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemsPerPage] = useState(50);
  const [facilityFilter, setFacilityFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [reqStatusFilters, setReqStatusFilters] = useState<Record<string, 'all' | 'completed' | 'scheduled' | 'pending'>>({});
  const [scheduledDates, setScheduledDates] = useState<{[key: string]: Date}>({});
  const [completedDates, setCompletedDates] = useState<{[key: string]: Date}>({});
  const [openDatePicker, setOpenDatePicker] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [popupPosition, setPopupPosition] = useState<{x: number, y: number} | null>(null);
  const [currentPopupEmployee, setCurrentPopupEmployee] = useState<any>(null);
  const [currentPopupFieldKey, setCurrentPopupFieldKey] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Click outside handler for date pickers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (openDatePicker && 
          !target.closest('.date-picker-popup') && 
          !target.closest('[data-radix-popper-content-wrapper]') &&
          !target.closest('input')) { // Don't close when clicking on input fields
        setOpenDatePicker(null);
        setPopupPosition(null);
        setCurrentPopupEmployee(null);
        setCurrentPopupFieldKey(null);
      }
    };

    if (openDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDatePicker]);
  
  // Training data hook for database operations
  const {
    scheduleTraining,
    completeTraining,
    rescheduleTraining,
    approveConference,
    rejectConference,
    isScheduling,
    isCompleting,
    isRescheduling,
    isApprovingConference,
    isRejectingConference,
  } = useTrainingData();


  // Handle search input changes
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  // Handle Enter key press to trigger search
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setSearchQuery(query);
    }
  }, [query]);

  // Server-side pagination with filters
  const filters = useMemo(() => ({
    level: activeTab,
    status: 'active',
    facility: facilityFilter !== 'all' ? facilityFilter : undefined,
    area: areaFilter !== 'all' ? areaFilter : undefined,
    search: searchQuery.trim() || undefined
  }), [activeTab, facilityFilter, areaFilter, searchQuery]);

  const {
    employees: currentEmployees,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    totalPages,
    totalEmployees,
    isFetching
  } = useEmployees(filters, itemsPerPage);

  // Get current level configuration
  const currentLevel: AwardType = getLevelFromTabKey(activeTab);
  const currentLevelConfig = LevelConfig[currentLevel];
  const currentColumns = LevelColumns[currentLevel];
  const currentFieldMapping = LevelFieldMapping[currentLevel];

  // Reset to page 1 when filters change (excluding search to prevent focus loss)
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [facilityFilter, areaFilter, currentPage, setCurrentPage]);

  // Server-side statistics
  const { data: levelStats } = useEmployeeStats(activeTab);

  // Sync active tab changes
  useEffect(() => {
    const event = new CustomEvent('levelChange', { detail: { level: activeTab } });
    window.dispatchEvent(event);
    setCurrentPage(1);
    setFacilityFilter('all');
    setAreaFilter('all');
    setQuery('');
    setSearchQuery('');
    const next: Record<string, 'all' | 'completed' | 'scheduled' | 'pending'> = {};
    currentColumns.forEach(col => {
      const fieldKey = currentFieldMapping[col];
      if (fieldKey) {
        next[fieldKey] = 'all';
      }
    });
    setReqStatusFilters(next);
  }, [activeTab, setCurrentPage]);

  // Removed old hash-based navigation - now using URL search params

  // Handle training assignment
  const handleTrainingAssignment = (assignments: any[]) => {
    console.log("Training assignments:", assignments);
    toast.success(`Assigned training to ${assignments.length} employees`);
  };

  // Get requirement status
  const computeRequirementStatus = (employee: any, fieldKey: string): 'completed' | 'scheduled' | 'pending' | 'rejected' => {
    if (fieldKey === 'secureCareAwarded') {
      if (employee[fieldKey]) return 'completed';
      return 'pending';
    }
    
    // Special handling for conference columns
    if (fieldKey === 'conferenceCompleted') {
      if (employee[fieldKey] && (employee.awaiting === true || employee.awaiting === 1)) {
        return 'completed'; // Conference is completed and approved
      }
      if (employee[fieldKey] && (employee.awaiting === false || employee.awaiting === 0)) {
        return 'pending'; // Conference is completed but awaiting approval (shows as "Awaiting")
      }
      if (employee[fieldKey] && employee.awaiting === null) {
        return 'rejected'; // Conference is completed but rejected
      }
      return 'pending'; // No conference completed yet
    }
    
    // Check if the requirement is completed
    if (employee[fieldKey]) return 'completed';
    
    // Check if the requirement is scheduled (has a schedule date but not completed)
    const scheduleField = ScheduleFieldMapping[fieldKey];
    if (scheduleField && employee[scheduleField]) {
      return 'scheduled';
    }
    
    return 'pending';
  };

  // Facility to area mapping for filtering
  const facilityToAreaMapping = useMemo(() => {
    const allFacilities = [
      'Afton Oaks Nursing and Rehabilitation Center', 'Alvarado Meadows Nursing and Rehab', 'Amarillo Skilled Care', 'Amistad', 'Arboretum of Winnie',
      // ... (all other facilities)
    ];
    
    const areas = ['Area 1', 'Area 2', 'Area 3', 'Area 4', 'Area 5', 'Area 6', 'Area 7', 'Area 8', 'Area 9', 'Area 10', 'Area 11', 'Area 12', 'Area 13', 'Area 14', 'Area 15', 'Area 16'];
    const mapping: { [facility: string]: string } = {};
    let facilityIndex = 0;
    
    for (let areaIndex = 0; areaIndex < areas.length; areaIndex++) {
      const facilitiesPerArea = areaIndex < 8 ? 10 : 11;
      for (let i = 0; i < facilitiesPerArea && facilityIndex < allFacilities.length; i++) {
        mapping[allFacilities[facilityIndex]] = areas[areaIndex];
        facilityIndex++;
      }
    }
    
    return mapping;
  }, []);

  const uniqueFacilities = useMemo(() => {
    if (areaFilter !== 'all') {
      const facilitiesInArea = Object.entries(facilityToAreaMapping)
        .filter(([_, area]) => area === areaFilter)
        .map(([facility, _]) => facility);
      return facilitiesInArea.sort();
    }
    return Object.keys(facilityToAreaMapping).sort();
  }, [areaFilter, facilityToAreaMapping]);

  const uniqueAreas = useMemo(() => {
    const allAreas = ['Area 1', 'Area 2', 'Area 3', 'Area 4', 'Area 5', 'Area 6', 'Area 7', 'Area 8', 'Area 9', 'Area 10', 'Area 11', 'Area 12', 'Area 13', 'Area 14', 'Area 15', 'Area 16'];
    return allAreas.sort((a, b) => {
      const numA = parseInt(a.replace('Area ', ''));
      const numB = parseInt(b.replace('Area ', ''));
      return numA - numB;
    });
  }, []);

  // Apply requirement status filters locally
  const filteredEmployees = useMemo(() => {
    const filtered = currentEmployees.filter(emp => {
      // Apply per-requirement filters
      for (const column of currentColumns) {
        const fieldKey = currentFieldMapping[column];
        if (!fieldKey) continue;
        
        const want = reqStatusFilters[fieldKey] || 'all';
        if (want === 'all') continue;
        
        const status = computeRequirementStatus(emp, fieldKey);
        if (status !== want) return false;
      }
      return true;
    });
    
    return filtered;
  }, [currentEmployees, reqStatusFilters, currentColumns, currentFieldMapping, scheduledDates, completedDates]);

  const isAnyFilterActive = useMemo(() => {
    if (facilityFilter !== 'all' || areaFilter !== 'all') return true;
    return currentColumns.some(col => {
      const fieldKey = currentFieldMapping[col];
      return fieldKey && (reqStatusFilters[fieldKey] || 'all') !== 'all';
    });
  }, [facilityFilter, areaFilter, reqStatusFilters, currentColumns, currentFieldMapping]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (facilityFilter !== 'all') count++;
    if (areaFilter !== 'all') count++;
    count += currentColumns.reduce((acc, col) => {
      const fieldKey = currentFieldMapping[col];
      return acc + (fieldKey && ((reqStatusFilters[fieldKey] || 'all') !== 'all') ? 1 : 0);
    }, 0);
    return count;
  }, [facilityFilter, areaFilter, reqStatusFilters, currentColumns, currentFieldMapping]);

  const clearFilters = () => {
    setFacilityFilter('all');
    setAreaFilter('all');
    setQuery('');
    setSearchQuery('');
    const reset: Record<string, 'all' | 'completed' | 'scheduled' | 'pending'> = {};
    currentColumns.forEach(col => {
      const fieldKey = currentFieldMapping[col];
      if (fieldKey) {
        reset[fieldKey] = 'all';
      }
    });
    setReqStatusFilters(reset);
  };

  // Helper function to check if conference is rejected
  const isConferenceRejected = (employee: any): boolean => {
    return employee.conferenceCompleted && employee.awaiting === null;
  };

  // Status badge rendering using new configuration
  const getStatusBadge = (employee: any, column: string) => {
    const fieldKey = currentFieldMapping[column];
    if (!fieldKey) return null;

    const value = employee[fieldKey];
    const key = `${employee.employeeId}-${fieldKey}`;
    const scheduledDate = scheduledDates[key];
    const completedDate = completedDates[key];
    const isDatePickerOpen = openDatePicker === key;
    const conferenceRejected = isConferenceRejected(employee);

    // Level 1 is read-only
    if (currentLevel === 'Level 1') {
      if (fieldKey === 'secureCareAwarded') {
        const awardStatus = fmt.awarded(employee.secureCareAwarded, employee.secureCareAwardedDate);
        const isPending = awardStatus === 'Pending';
        
        return (
          <div className={`inline-flex items-center justify-center gap-2 px-2 py-1 rounded-full text-sm font-semibold shadow-sm min-w-[100px] ${
            isPending 
              ? 'bg-gray-100 text-gray-600' 
              : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
          }`}>
            {!isPending && <CheckCircle className="w-4 h-4" />}
            {isPending && <Clock className="w-4 h-4" />}
            <span className="text-sm font-medium">
              {awardStatus}
              </span>
          </div>
        );
      }

      if (value) {
        return (
          <div className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-2 rounded-full text-sm font-semibold shadow-sm min-w-[100px]">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {fmt.date(value)}
            </span>
          </div>
        );
      }

        return (
        <div className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm font-semibold min-w-[100px]">
          <Clock className="w-4 h-4" />
          <span className="text-sm">Pending</span>
          </div>
        );
      }

    // Conference approval logic for other levels
    if (fieldKey === 'conferenceCompleted') {
      const status = fmt.conference(employee.awaiting, value);
      
      if (status.startsWith('Awaiting')) {
      return (
        <div className="flex flex-col items-center gap-1 w-full">
          <button
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setPopupPosition({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
                setCurrentPopupEmployee(employee);
                setCurrentPopupFieldKey(fieldKey);
                setOpenDatePicker(key);
              }}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-2 py-1 rounded-full text-sm font-semibold shadow-sm min-w-[100px] hover:from-amber-600 hover:to-yellow-600 cursor-pointer transition-colors"
          >
            <Clock className="w-4 h-4" />
              <span className="text-sm">Awaiting</span>
          </button>
            <div className="inline-flex items-center justify-center gap-1 bg-amber-50 border border-amber-200 rounded px-2 py-1 min-w-[100px]">
              <span className="text-sm text-amber-700 font-medium">
                {fmt.date(value)}
              </span>
            </div>
        </div>
      );
    }

      if (status === 'Rejected') {
        return (
          <div className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-3 py-2 rounded-full text-sm font-semibold shadow-sm min-w-[100px]">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Rejected</span>
          </div>
        );
      }
      
      if (value) {
        return (
          <div className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-2 rounded-full text-sm font-semibold shadow-sm min-w-[100px]">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {fmt.date(value)}
              </span>
          </div>
        );
      }
      
        return (
            <button
          onClick={() => setOpenDatePicker(key)}
          className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm font-semibold shadow-sm min-w-[100px] hover:bg-gray-200 cursor-pointer transition-colors"
            >
              <Clock className="w-4 h-4" />
          <span className="text-sm">Pending</span>
            </button>
      );
    }

    // Award columns are read-only
    if (fieldKey === 'secureCareAwarded') {
      const awardStatus = fmt.awarded(employee.secureCareAwarded, employee.secureCareAwardedDate);
      const isPending = awardStatus === 'Pending';
      
        return (
        <div className={`inline-flex items-center justify-center gap-2 px-2 py-1 rounded-full text-sm font-semibold shadow-sm min-w-[100px] ${
          isPending 
            ? 'bg-gray-100 text-gray-600' 
            : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
        }`}>
          {!isPending && <CheckCircle className="w-4 h-4" />}
          {isPending && <Clock className="w-4 h-4" />}
          <span className="text-sm font-medium">
            {awardStatus}
                </span>
          </div>
        );
      }

    // Regular training items with schedule/complete workflow
    const scheduleFieldKey = ScheduleFieldMapping[fieldKey];
    const scheduledValue = scheduleFieldKey ? employee[scheduleFieldKey] : null;
           
    const status = fmt.scheduledOrDone(scheduledValue, value);
    
    if (value) {
             return (
        <div className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-2 rounded-full text-sm font-semibold shadow-sm min-w-[100px]">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">
            {fmt.date(value)}
          </span>
               </div>
             );
        }
        
    if (scheduledValue) {
           return (
             <div className="flex flex-col items-center gap-1 w-full">
               <button
            onClick={conferenceRejected ? undefined : (e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setPopupPosition({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
              setCurrentPopupEmployee(employee);
              setCurrentPopupFieldKey(fieldKey);
              setOpenDatePicker(key);
            }}
            disabled={conferenceRejected}
            className={`inline-flex items-center justify-center gap-2 px-2 py-1 rounded-full text-sm font-semibold shadow-sm min-w-[100px] transition-colors ${
              conferenceRejected 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 cursor-pointer'
            }`}
               >
                 <Clock className="w-4 h-4" />
                 <span className="text-sm">Scheduled</span>
               </button>
          <div className="inline-flex items-center justify-center gap-1 bg-yellow-50 border border-yellow-200 rounded px-2 py-1 min-w-[100px]">
                 <span className="text-sm text-yellow-700 font-medium">
              {fmt.date(scheduledValue)}
                 </span>
               </div>
            </div>
          );
        }
         
         return (
           <div>
             <button
          onClick={conferenceRejected ? undefined : (e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setPopupPosition({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
            setCurrentPopupEmployee(employee);
            setCurrentPopupFieldKey(fieldKey);
            setOpenDatePicker(key);
          }}
               disabled={isScheduling || conferenceRejected}
          className={`inline-flex items-center justify-center gap-2 px-2 py-1 rounded-full text-sm font-semibold shadow-sm min-w-[100px] transition-colors ${
            conferenceRejected 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
             >
               <Clock className="w-4 h-4" />
               <span className="text-sm">{isScheduling ? 'Scheduling...' : 'Pending'}</span>
             </button>
           </div>
         );
       };

  const levelConfigMap = {
    "level-1": { title: "Level 1", icon: Users, color: "text-blue-600" },
    "level-2": { title: "Level 2", icon: Award, color: "text-green-600" },
    "level-3": { title: "Level 3", icon: Star, color: "text-purple-600" },
     "consultant": { title: "Consultant", icon: GraduationCap, color: "text-orange-600" },
     "coach": { title: "Coach", icon: TrendingUp, color: "text-teal-600" }
   };

   // Loading state
   if (isLoading) {
     return (
       <div className="flex items-center justify-center h-64">
         <div className="text-center">
           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
           <p className="text-gray-600">Loading employees...</p>
         </div>
       </div>
     );
   }

   // Error state
   if (error) {
     return (
       <div className="flex items-center justify-center h-64">
         <div className="text-center">
           <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
           <p className="text-red-600">Failed to load employees</p>
           <Button onClick={() => window.location.reload()} className="mt-2">
             Retry
           </Button>
         </div>
       </div>
     );
   }

   return (
     <TooltipProvider>
       <div className="flex flex-col h-full">
          {!isModalOpen && (
            <FloatingNav
              navItems={[
                { name: "Level 1", link: "level-1", icon: <Users className="h-4 w-4" /> },
                { name: "Level 2", link: "level-2", icon: <Award className="h-4 w-4" /> },
                { name: "Level 3", link: "level-3", icon: <Star className="h-4 w-4" /> },
                { name: "Consultant", link: "consultant", icon: <GraduationCap className="h-4 w-4" /> },
                { name: "Coach", link: "coach", icon: <TrendingUp className="h-4 w-4" /> },
              ]}
              className="top-0"
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          )}

          {/* Page Header */}
          <PageHeader
            icon={GraduationCap}
            title="Training Management"
            description="Manage employee training assignments, track progress, and award certifications"
          />
        
        {/* Sticky Table Header */}
          <div className="sticky top-0 z-20 bg-purple-100 border-b border-purple-200 shadow-md">
           <div className="px-3 sm:px-4 md:px-6 py-2 flex items-center justify-between gap-2 sm:gap-3">
             <div className="flex-1 max-w-[200px] sm:max-w-[300px] md:max-w-sm pt-5">
               <div className="relative">
                 <div className="relative">
                   <Input
                     ref={searchInputRef}
                     value={query}
                     onChange={handleSearchChange}
                     onKeyDown={handleSearchKeyDown}
                     placeholder="Search employee by name or ID (Press Enter to search)"
                     className="h-8 sm:h-9 text-sm sm:text-base pr-8 bg-white/90 border-gray-300 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                   />
                   {query && (
                     <button
                       onClick={() => {
                         setQuery('');
                         setSearchQuery('');
                       }}
                       className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                     >
                       <X className="w-4 h-4" />
                     </button>
                   )}
                 </div>
               </div>
             </div>
            {isAnyFilterActive && (
              <Button
                variant="default"
                size="sm"
                onClick={clearFilters}
                className="h-7 sm:h-8 px-2 sm:px-3 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-sm text-xs sm:text-sm"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Clear filters</span>
                <span className="sm:hidden">Clear</span>
                <span className="ml-1 sm:ml-2 inline-flex items-center justify-center rounded-full bg-white/20 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-medium">
                  {activeFilterCount}
                </span>
              </Button>
            )}
          </div>
          <div className="px-6">
                     <Table className="table-fixed w-full">
                       <TableHeader>
                         <TableRow className="bg-purple-100 border-b border-purple-200">
                  {currentColumns.map((column, index) => (
                    <TableHead 
                      key={index} 
                      className={`font-bold text-purple-900 py-4 px-4 bg-purple-100 text-base whitespace-pre-line text-center align-middle ${
                        index === 0 ? "w-[12%]" : 
                        column.includes("Awarded") ? "w-[12%]" : "w-[10%]"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="whitespace-pre-line">{column}</span>
                        {index === 1 && ( // Facility column
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 px-1">
                            <Filter className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                                                 <DropdownMenuContent align="end" className="w-80 max-h-[600px] overflow-y-auto scrollbar-hide">
                           <DropdownMenuLabel>Filter by Facility ({uniqueFacilities.length} total)</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                                                     <DropdownMenuRadioGroup value={facilityFilter} onValueChange={(v) => setFacilityFilter(v)}>
                             <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                             {uniqueFacilities.map(f => (
                               <DropdownMenuRadioItem key={f} value={f} className="py-2">{f}</DropdownMenuRadioItem>
                             ))}
                           </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                        )}
                        {index === 2 && ( // Area column
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 px-1">
                            <Filter className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel>Filter by Area</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                                                     <DropdownMenuRadioGroup value={areaFilter} onValueChange={(v) => {
                             setAreaFilter(v);
                             setFacilityFilter('all');
                           }}>
                            <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                            {uniqueAreas.map(a => (
                              <DropdownMenuRadioItem key={a} value={a}>{a}</DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                        )}
                        {index > 2 && ( // Training requirement columns
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <Button variant="ghost" size="sm" className="h-6 px-1 mt-1 flex-shrink-0">
                               <Filter className="w-4 h-4" />
                             </Button>
                           </DropdownMenuTrigger>
                                                     <DropdownMenuContent align="end" className="w-44">
                             <DropdownMenuLabel>Status</DropdownMenuLabel>
                             <DropdownMenuSeparator />
                              <DropdownMenuRadioGroup 
                                value={reqStatusFilters[currentFieldMapping[column]] || 'all'} 
                                onValueChange={(v) => {
                                  const fieldKey = currentFieldMapping[column];
                                  if (fieldKey) {
                                    setReqStatusFilters(prev => ({ ...prev, [fieldKey]: v as any }));
                                  }
                                }}
                              >
                               <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                                {column.includes("Awarded") ? (
                                 <>
                                   <DropdownMenuRadioItem value="completed">Awarded</DropdownMenuRadioItem>
                                   <DropdownMenuRadioItem value="pending">Pending</DropdownMenuRadioItem>
                                 </>
                               ) : column.includes("Conference") ? (
                                 <>
                                   <DropdownMenuRadioItem value="completed">Completed</DropdownMenuRadioItem>
                                   <DropdownMenuRadioItem value="pending">Awaiting</DropdownMenuRadioItem>
                                   <DropdownMenuRadioItem value="rejected">Rejected</DropdownMenuRadioItem>
                                 </>
                               ) : (
                                 <>
                                   <DropdownMenuRadioItem value="completed">Completed</DropdownMenuRadioItem>
                                   <DropdownMenuRadioItem value="scheduled">Scheduled</DropdownMenuRadioItem>
                                   <DropdownMenuRadioItem value="pending">Pending</DropdownMenuRadioItem>
                                 </>
                               )}
                             </DropdownMenuRadioGroup>
                           </DropdownMenuContent>
                        </DropdownMenu>
                        )}
                      </div>
                    </TableHead>
                           ))}
                         </TableRow>
                       </TableHeader>
                     </Table>
                   </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className={`flex-1 flex flex-col ${isModalOpen ? 'mt-0' : 'mt-0'}`}>
          {/* Table Container with Scrollable Body */}
          <div className="flex-1 flex flex-col min-h-0">
            {Object.entries(levelConfigMap).map(([level, config]) => (
              <TabsContent key={level} value={level} className="flex-1 flex flex-col min-h-0" style={{ display: activeTab === level ? 'flex' : 'none' }}>
                <Card className="border-0 shadow-lg flex-1 flex flex-col min-h-0">
                  <CardContent className="p-0 flex-1 flex flex-col min-h-0">
                   {/* Scrollable Table Body */}
                   <div className="flex-1 overflow-auto min-h-0">
                     <Table>
                       <TableBody>
                          {filteredEmployees.map((employee, index) => (
                             <TableRow key={employee.employeeId} className={`${index % 2 === 0 ? 'bg-white' : 'bg-purple-50/30'} hover:bg-purple-50/60 transition-all duration-200 border-b border-purple-100`}>
                              {currentColumns.map((column, colIndex) => {
                                const fieldKey = currentFieldMapping[column];
                                
                                                                 if (colIndex === 0) { // Employee column
                                   return (
                                     <TableCell key={colIndex} className="py-4 px-4 w-[12%] text-center">
                                  <div className="flex flex-col items-center justify-center">
                                    <EmployeeDetailModal 
                                      employee={employee}
                                      onModalOpenChange={setIsModalOpen}
                                    >
                                      <div className="font-semibold text-purple-900 text-base cursor-pointer hover:text-purple-600 hover:underline transition-colors">
                                             {employee.name || employee.Employee}
                                      </div>
                                    </EmployeeDetailModal>
                                         <div className="text-sm text-gray-500">{employee.employeeNumber || employee.employeeId}</div>
                                  </div>
                                </TableCell>
                                   );
                                } else if (colIndex === 1) { // Facility column
                                   return (
                                     <TableCell key={colIndex} className="py-4 px-4 w-[10%] text-center">
                                  <div className="flex justify-center">
                                    <div className="bg-purple-100 rounded-lg px-2 py-1 inline-block">
                                         <span className="text-sm font-medium text-purple-700">{employee.facility || employee.Facility}</span>
                                    </div>
                                  </div>
                                </TableCell>
                                   );
                                } else if (colIndex === 2) { // Area column
                                   return (
                                     <TableCell key={colIndex} className="py-4 px-4 w-[10%] text-center">
                                  <div className="flex justify-center">
                                    <div className="bg-lavender-100 rounded-lg px-2 py-1 inline-block">
                                         <span className="text-sm font-medium text-lavender-700">{employee.area || employee.Area}</span>
                                    </div>
                                  </div>
                                </TableCell>
                                   );
                                } else { // Training requirement columns
                                   return (
                                     <TableCell key={colIndex} className={`py-4 px-4 text-center ${
                                       column.includes("Awarded") ? "w-[12%]" : "w-[10%]"
                                     }`}>
                                       <div className="flex justify-center items-center">
                                        {getStatusBadge(employee, column)}
                                      </div>
                                 </TableCell>
                           );
                                }
                         })}
                            </TableRow>
                          ))}
                       </TableBody>
                     </Table>
                   </div>

                                      {/* Compact Pagination */}
                   <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-4">
                     <div className="flex items-center justify-between">
                       <div className="text-sm text-gray-600">
                         {isFetching && <span className="text-purple-600">• Loading...</span>}
                       </div>
                       {totalPages > 1 && (
                         <CompactPagination
                           currentPage={currentPage}
                           totalPages={totalPages}
                           onPageChange={setCurrentPage}
                           totalItems={totalEmployees}
                           itemsPerPage={itemsPerPage}
                           showInfo={false}
                         />
                       )}
                     </div>
                   </div>
                 </CardContent>
               </Card>
             </TabsContent>
           ))}
         </div>
       </Tabs>
       </div>
       
       {/* Portal popup for conference approval */}
       {openDatePicker && popupPosition && currentPopupEmployee && openDatePicker.includes('conferenceCompleted') && createPortal(
         <div 
           className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-xl p-3 date-picker-popup"
           style={{
             left: `${popupPosition.x}px`,
             top: `${popupPosition.y}px`,
             transform: 'translateX(-50%)'
           }}
         >
           <div className="flex flex-col gap-2">
             <button
               onClick={() => {
                 approveConference({ employeeId: currentPopupEmployee.employeeId });
                 setOpenDatePicker(null);
                 setPopupPosition(null);
                 setCurrentPopupEmployee(null);
               }}
               disabled={isApprovingConference}
               className="inline-flex items-center justify-center gap-2 bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <CheckCircle className="w-4 h-4" />
               {isApprovingConference ? 'Approving...' : 'Approve'}
             </button>
             <button
               onClick={() => {
                 rejectConference({ employeeId: currentPopupEmployee.employeeId });
                 setOpenDatePicker(null);
                 setPopupPosition(null);
                 setCurrentPopupEmployee(null);
               }}
               disabled={isRejectingConference}
               className="inline-flex items-center justify-center gap-2 bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <AlertCircle className="w-4 h-4" />
               {isRejectingConference ? 'Rejecting...' : 'Reject'}
             </button>
           </div>
         </div>,
         document.body
       )}
       
       {/* Portal popup for Mark Complete/Reschedule */}
       {openDatePicker && popupPosition && currentPopupEmployee && currentPopupFieldKey && 
        !openDatePicker.includes('conferenceCompleted') && 
        !openDatePicker.startsWith('reschedule-') &&
        ScheduleFieldMapping[currentPopupFieldKey] && 
        currentPopupEmployee[ScheduleFieldMapping[currentPopupFieldKey]] && createPortal(
         <div 
           className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-xl p-3 date-picker-popup"
           style={{
             left: `${popupPosition.x}px`,
             top: `${popupPosition.y}px`,
             transform: 'translateX(-50%)'
           }}
         >
           <div className="flex flex-col gap-2">
             <button
               onClick={() => {
                 completeTraining({ employeeId: currentPopupEmployee.employeeId, requirementKey: currentPopupFieldKey });
                 setOpenDatePicker(null);
                 setPopupPosition(null);
                 setCurrentPopupEmployee(null);
                 setCurrentPopupFieldKey(null);
               }}
               disabled={isCompleting}
               className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:from-blue-600 hover:to-indigo-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <CheckCircle className="w-4 h-4" />
               {isCompleting ? 'Completing...' : 'Mark Complete'}
             </button>
             <button
               onClick={() => {
                 setOpenDatePicker(`reschedule-${openDatePicker}`);
               }}
               disabled={isRescheduling}
               className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:from-yellow-600 hover:to-orange-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <Clock className="w-4 h-4" />
               {isRescheduling ? 'Rescheduling...' : 'Reschedule'}
             </button>
           </div>
         </div>,
         document.body
       )}
       
       {/* Portal popup for Reschedule Date Picker */}
       {openDatePicker && popupPosition && currentPopupEmployee && currentPopupFieldKey && 
        openDatePicker.startsWith('reschedule-') && createPortal(
         <div 
           className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-xl p-3 date-picker-popup"
           style={{
             left: `${popupPosition.x}px`,
             top: `${popupPosition.y}px`,
             transform: 'translateX(-50%)'
           }}
         >
           <DatePicker
             date={parseDate(currentPopupEmployee[ScheduleFieldMapping[currentPopupFieldKey]]) || undefined}
             onDateChange={(date) => {
               if (date) {
                 rescheduleTraining({ employeeId: currentPopupEmployee.employeeId, requirementKey: currentPopupFieldKey, date });
                 setOpenDatePicker(null);
                 setPopupPosition(null);
                 setCurrentPopupEmployee(null);
                 setCurrentPopupFieldKey(null);
               }
             }}
             placeholder="Reschedule date"
           />
         </div>,
         document.body
       )}
       
       {/* Portal popup for Schedule Date Picker */}
       {openDatePicker && popupPosition && currentPopupEmployee && currentPopupFieldKey && 
        !openDatePicker.includes('conferenceCompleted') && 
        !openDatePicker.startsWith('reschedule-') &&
        ((!ScheduleFieldMapping[currentPopupFieldKey]) || 
         (ScheduleFieldMapping[currentPopupFieldKey] && !currentPopupEmployee[ScheduleFieldMapping[currentPopupFieldKey]])) && createPortal(
         <div 
           className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-xl p-3 date-picker-popup"
           style={{
             left: `${popupPosition.x}px`,
             top: `${popupPosition.y}px`,
             transform: 'translateX(-50%)'
           }}
         >
           <DatePicker
             date={undefined}
             onDateChange={(date) => {
               if (date) {
                 scheduleTraining({ employeeId: currentPopupEmployee.employeeId, requirementKey: currentPopupFieldKey, date });
                 setOpenDatePicker(null);
                 setPopupPosition(null);
                 setCurrentPopupEmployee(null);
                 setCurrentPopupFieldKey(null);
               }
             }}
             placeholder="Schedule date"
           />
         </div>,
         document.body
       )}
     </TooltipProvider>
   );
 }

