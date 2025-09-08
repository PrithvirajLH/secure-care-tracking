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
  X,
  MessageSquare,
  UserCheck,
  Edit3,
  Save,
  ChevronDown
} from "lucide-react";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ShineBorder } from "@/components/magicui/shine-border";
import { motion, AnimatePresence } from "framer-motion";
import { EnhancedSelect } from "@/components/ui/enhanced-select";

import { toast } from "sonner";
import { useTrainingData } from "@/hooks/useTrainingData";
import EmployeeDetailModal from "@/components/EmployeeDetailModal";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { useEmployees, useEmployeeStats, useTrainingEmployees } from "@/hooks/useEmployees";
import PageHeader from "@/components/PageHeader";
import { trainingAPI } from "@/services/api";
import { useQuery } from "@tanstack/react-query";

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
  NOTES_OPTIONS,
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
  const [reqStatusFilters, setReqStatusFilters] = useState<Record<string, string>>({});
  
  // Enhanced UI state
  const [advisors, setAdvisors] = useState<any[]>([]);
  const [isLoadingAdvisors, setIsLoadingAdvisors] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [editingAdvisor, setEditingAdvisor] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState<string>("");
  const [tempAdvisor, setTempAdvisor] = useState<string>("");
  const [notesDropdownOpen, setNotesDropdownOpen] = useState<string | null>(null);
  const [advisorDropdownOpen, setAdvisorDropdownOpen] = useState<string | null>(null);
  const [notesPopupPosition, setNotesPopupPosition] = useState<{x: number, y: number, positionAbove?: boolean} | null>(null);
  const [advisorPopupPosition, setAdvisorPopupPosition] = useState<{x: number, y: number, positionAbove?: boolean} | null>(null);
  const [scheduledDates, setScheduledDates] = useState<{[key: string]: Date}>({});
  const [completedDates, setCompletedDates] = useState<{[key: string]: Date}>({});
  const [openDatePicker, setOpenDatePicker] = useState<string | null>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-dropdown]') && !target.closest('.date-picker-popup')) {
        setNotesDropdownOpen(null);
        setAdvisorDropdownOpen(null);
        setNotesPopupPosition(null);
        setAdvisorPopupPosition(null);
        // Don't clear popupPosition if date picker is open
        if (!openDatePicker) {
          setPopupPosition(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDatePicker]);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [popupPosition, setPopupPosition] = useState<{x: number, y: number, positionAbove?: boolean} | null>(null);
  const [currentPopupEmployee, setCurrentPopupEmployee] = useState<any>(null);
  const [currentPopupFieldKey, setCurrentPopupFieldKey] = useState<string | null>(null);
  const [isButtonClicking, setIsButtonClicking] = useState<boolean>(false);
  const [isMouseDownInProgress, setIsMouseDownInProgress] = useState<boolean>(false);
  
  // New simple search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  
  // Column visibility controls with localStorage persistence
  const [showNotesColumn, setShowNotesColumn] = useState<boolean>(() => {
    const saved = localStorage.getItem('showNotesColumn');
    return saved ? JSON.parse(saved) : false;
  });
  const [showAdvisorColumn, setShowAdvisorColumn] = useState<boolean>(() => {
    const saved = localStorage.getItem('showAdvisorColumn');
    return saved ? JSON.parse(saved) : false;
  });
  
  // Click outside handler for date pickers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (openDatePicker && 
          !isButtonClicking &&
          !isMouseDownInProgress &&
          !target.closest('.date-picker-popup') && 
          !target.closest('[data-radix-popper-content-wrapper]') &&
          !target.closest('input') &&
          !target.closest('button')) { // Don't close when clicking on buttons
        setOpenDatePicker(null);
        setPopupPosition(null);
        setCurrentPopupEmployee(null);
        setCurrentPopupFieldKey(null);
      }
    };

    if (openDatePicker) {
      // Use a longer delay to allow mousedown events to process first
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 200);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside);
      };
    }
   }, [openDatePicker, isButtonClicking, isMouseDownInProgress]);
  
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




  // Load advisors when component mounts or when needed
  const loadAdvisors = useCallback(async () => {
    if (advisors.length > 0) return; // Already loaded
    
    setIsLoadingAdvisors(true);
    try {
      const advisorList = await trainingAPI.getAdvisors();
      setAdvisors(advisorList);
    } catch (error) {
      console.error('Failed to load advisors:', error);
      toast.error('Failed to load advisors');
    } finally {
      setIsLoadingAdvisors(false);
    }
  }, [advisors.length]);

  // Enhanced notes editing handlers
  const handleEditNotes = (employeeId: string, currentNotes: string) => {
    setEditingNotes(employeeId);
    setTempNotes(currentNotes || '');
  };

  const handleSaveNotes = async (employeeId: string, notesValue?: string) => {
    try {
      const valueToSave = notesValue !== undefined ? notesValue : tempNotes;
      await trainingAPI.updateEmployeeNotes(employeeId, valueToSave);
      toast.success('Notes updated successfully');
      setEditingNotes(null);
      setTempNotes('');
      // Invalidate queries to refresh data without page reload
      window.dispatchEvent(new CustomEvent('refreshEmployees'));
    } catch (error) {
      console.error('Failed to update notes:', error);
      toast.error('Failed to update notes');
    }
  };

  const handleCancelNotes = () => {
    setEditingNotes(null);
    setTempNotes('');
  };

  // Enhanced advisor editing handlers
  const handleEditAdvisor = (employeeId: string, currentAdvisorId: string) => {
    setEditingAdvisor(employeeId);
    setTempAdvisor(currentAdvisorId || 'none');
  };

  const handleSaveAdvisor = async (employeeId: string, advisorValue?: string) => {
    try {
      const valueToUse = advisorValue !== undefined ? advisorValue : tempAdvisor;
      const advisorId = (valueToUse === '' || valueToUse === 'none') ? null : parseInt(valueToUse);
      await trainingAPI.updateEmployeeAdvisor(employeeId, advisorId);
      toast.success('Advisor updated successfully');
      setEditingAdvisor(null);
      setTempAdvisor('');
      // Invalidate queries to refresh data without page reload
      window.dispatchEvent(new CustomEvent('refreshEmployees'));
    } catch (error) {
      console.error('Failed to update advisor:', error);
      toast.error('Failed to update advisor');
    }
  };

  const handleCancelAdvisor = () => {
    setEditingAdvisor(null);
    setTempAdvisor('none');
  };

  // Server-side pagination with filters
  const filters = useMemo(() => ({
    level: activeTab,
    status: 'active',
    facility: facilityFilter !== 'all' ? facilityFilter : undefined,
    area: areaFilter !== 'all' ? areaFilter : undefined
  }), [activeTab, facilityFilter, areaFilter]);

  const {
    employees: currentEmployees,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    totalPages,
    totalEmployees,
    isFetching,
    refetch
  } = useTrainingEmployees(filters, itemsPerPage);

  // Get current level configuration
  const currentLevel: AwardType = getLevelFromTabKey(activeTab);
  const currentLevelConfig = LevelConfig[currentLevel];
  const currentColumns = LevelColumns[currentLevel];
  const currentFieldMapping = LevelFieldMapping[currentLevel];
  
  // Filter columns based on visibility settings (only for levels 2-5)
  const filteredColumns = useMemo(() => {
    if (currentLevel === 'Level 1') {
      return currentColumns; // Level 1 doesn't have Notes/Advisor columns
    }
    
    return currentColumns.filter(column => {
      if (column === 'Notes' && !showNotesColumn) return false;
      if (column === 'Advisor' && !showAdvisorColumn) return false;
      return true;
    });
  }, [currentColumns, showNotesColumn, showAdvisorColumn, currentLevel]);

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
    
    const next: Record<string, string> = {};
    filteredColumns.forEach(col => {
      const fieldKey = currentFieldMapping[col];
      if (fieldKey) {
        next[fieldKey] = 'all';
      }
    });
    setReqStatusFilters(next);
  }, [activeTab, setCurrentPage, filteredColumns, currentFieldMapping]);

  // Load advisors when component mounts
  useEffect(() => {
    loadAdvisors();
  }, [loadAdvisors]);

  // Persist column visibility state to localStorage
  useEffect(() => {
    localStorage.setItem('showNotesColumn', JSON.stringify(showNotesColumn));
  }, [showNotesColumn]);

  useEffect(() => {
    localStorage.setItem('showAdvisorColumn', JSON.stringify(showAdvisorColumn));
  }, [showAdvisorColumn]);

  // Listen for refresh events to update data without page reload
  useEffect(() => {
    const handleRefresh = () => {
      // Trigger a refetch of the current data
      refetch();
    };

    window.addEventListener('refreshEmployees', handleRefresh);
    return () => {
      window.removeEventListener('refreshEmployees', handleRefresh);
    };
  }, [refetch]);


  // Removed old hash-based navigation - now using URL search params

  // Handle training assignment
  const handleTrainingAssignment = (assignments: any[]) => {
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
      if (employee[fieldKey] && (employee.awaiting === false || employee.awaiting === 0)) {
        return 'completed'; // Conference is completed and approved
      }
      if (employee[fieldKey] && (employee.awaiting === true || employee.awaiting === 1)) {
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

  // Fetch filter options from API
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: () => trainingAPI.getFilterOptions(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Facility to area mapping for filtering - now using dynamic data
  const facilityToAreaMapping = useMemo(() => {
    if (!filterOptions?.facilities || !filterOptions?.areas) {
      return {};
    }
    
    const allFacilities = filterOptions.facilities;
    const areas = filterOptions.areas;
    const mapping: { [facility: string]: string } = {};
    let facilityIndex = 0;
    
    for (let areaIndex = 0; areaIndex < areas.length; areaIndex++) {
      const facilitiesPerArea = Math.ceil(allFacilities.length / areas.length);
      for (let i = 0; i < facilitiesPerArea && facilityIndex < allFacilities.length; i++) {
        mapping[allFacilities[facilityIndex]] = areas[areaIndex];
        facilityIndex++;
      }
    }
    
    return mapping;
  }, [filterOptions]);

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
    if (!filterOptions?.areas) {
      return [];
    }
    return filterOptions.areas.sort((a, b) => {
      const numA = parseInt(a.replace('Area ', ''));
      const numB = parseInt(b.replace('Area ', ''));
      return numA - numB;
    });
  }, [filterOptions]);

  // Apply requirement status filters and search filter locally
  const filteredEmployees = useMemo(() => {
    let filtered = currentEmployees;
    
    // Apply search filter first
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(emp => {
        const name = (emp.name || emp.Employee || '').toLowerCase();
        const employeeNumber = (emp.employeeNumber || emp.employeeId || '').toLowerCase();
        return name.includes(searchTerm) || employeeNumber.includes(searchTerm);
      });
    }
    
    // Apply per-requirement filters
    filtered = filtered.filter(emp => {
      for (const column of filteredColumns) {
        const fieldKey = currentFieldMapping[column];
        if (!fieldKey) continue;
        
        const want = reqStatusFilters[fieldKey] || 'all';
        if (want === 'all') continue;

        // Custom filtering for Notes
        if (column === 'Notes') {
          const noteValue = (emp.notes || '').trim();
          if (want === 'empty') {
            if (noteValue !== '') return false;
          } else {
            if (noteValue !== want) return false;
          }
          continue;
        }

        // Custom filtering for Advisor
        if (column === 'Advisor') {
          const advisorId = emp.advisorId != null ? String(emp.advisorId) : '';
          const hasAdvisor = advisorId !== '' || (emp.advisorName && String(emp.advisorName).trim() !== '');
          if (want === 'unassigned') {
            if (hasAdvisor) return false;
          } else if (want === 'assigned') {
            if (!hasAdvisor) return false;
          } else {
            // Specific advisor by id
            if (advisorId !== want) return false;
          }
          continue;
        }

        const status = computeRequirementStatus(emp, fieldKey);
        if (status !== want) return false;
      }
      return true;
    });
    
    return filtered;
  }, [currentEmployees, searchQuery, reqStatusFilters, filteredColumns, currentFieldMapping, scheduledDates, completedDates]);

  const isAnyFilterActive = useMemo(() => {
    if (facilityFilter !== 'all' || areaFilter !== 'all' || searchQuery.trim()) return true;
    return filteredColumns.some(col => {
      const fieldKey = currentFieldMapping[col];
      return fieldKey && (reqStatusFilters[fieldKey] || 'all') !== 'all';
    });
  }, [facilityFilter, areaFilter, searchQuery, reqStatusFilters, filteredColumns, currentFieldMapping]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (facilityFilter !== 'all') count++;
    if (areaFilter !== 'all') count++;
    if (searchQuery.trim()) count++;
    count += filteredColumns.reduce((acc, col) => {
      const fieldKey = currentFieldMapping[col];
      return acc + (fieldKey && ((reqStatusFilters[fieldKey] || 'all') !== 'all') ? 1 : 0);
    }, 0);
    return count;
  }, [facilityFilter, areaFilter, searchQuery, reqStatusFilters, filteredColumns, currentFieldMapping]);

  const clearFilters = () => {
    setFacilityFilter('all');
    setAreaFilter('all');
    setSearchQuery('');
    
    const reset: Record<string, string> = {};
    filteredColumns.forEach(col => {
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

  // Standardized badge component for consistent sizing
  const StatusBadge = ({ 
    children, 
    variant = 'default', 
    onClick, 
    onMouseDown,
    disabled = false, 
    className = '',
    icon: Icon,
    text,
    date
  }: {
    children?: React.ReactNode;
    variant?: 'default' | 'pending' | 'scheduled' | 'completed' | 'awaiting' | 'rejected' | 'awarded' | 'notes' | 'advisor';
    onClick?: (e?: React.MouseEvent) => void;
    onMouseDown?: (e?: React.MouseEvent) => void;
    disabled?: boolean;
    className?: string;
    icon?: React.ComponentType<{ className?: string }>;
    text?: string;
    date?: string;
  }) => {
    const baseClasses = "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-semibold shadow-sm min-w-[120px] h-8 transition-colors";
    
    const variantClasses = {
      default: "bg-gray-100 text-gray-600 hover:bg-gray-200",
      pending: "bg-gray-100 text-gray-600 hover:bg-gray-200",
      scheduled: "bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600",
      completed: "bg-gradient-to-r from-blue-500 to-indigo-500 text-white",
      awaiting: "bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:from-amber-600 hover:to-yellow-600",
      rejected: "bg-gradient-to-r from-red-500 to-pink-500 text-white",
      awarded: "bg-gradient-to-r from-green-500 to-emerald-500 text-white",
      notes: "bg-gradient-to-r from-cyan-50 to-blue-50 text-cyan-700 border border-cyan-200 hover:from-cyan-100 hover:to-blue-100 hover:border-cyan-300",
      advisor: "bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border border-purple-200 hover:from-purple-100 hover:to-indigo-100 hover:border-purple-300"
    };

    const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer";
    
    const content = (
      <>
        {Icon && <Icon className="w-4 h-4" />}
        <span className="text-sm font-medium">{text}</span>
      </>
    );

    if ((onClick || onMouseDown) && !disabled) {
      return (
        <button
          onClick={onClick}
          onMouseDown={onMouseDown}
          className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}
        >
          {content}
        </button>
      );
    }

    return (
      <div className={`${baseClasses} ${variantClasses[variant]} ${disabledClasses} ${className}`}>
        {content}
      </div>
    );
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
          <StatusBadge
            variant={isPending ? 'pending' : 'awarded'}
            icon={isPending ? Clock : CheckCircle}
            text={awardStatus}
          />
        );
      }

      if (value) {
        return (
          <StatusBadge
            variant="completed"
            icon={CheckCircle}
            text={fmt.date(value)}
          />
        );
      }

      return (
        <StatusBadge
          variant="pending"
          icon={Clock}
          text="Pending"
        />
      );
    }

    // Conference approval logic for other levels
    if (fieldKey === 'conferenceCompleted') {
      const status = fmt.conference(employee.awaiting, value);
      
      if (status.startsWith('Awaiting')) {
        return (
          <div className="flex flex-col items-center gap-1 w-full">
            <StatusBadge
              variant="awaiting"
              icon={Clock}
              text="Awaiting"
              onClick={(e) => {
                const rect = (e.target as HTMLElement).getBoundingClientRect();
                setPopupPosition({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
                setCurrentPopupEmployee(employee);
                setCurrentPopupFieldKey(fieldKey);
                setOpenDatePicker(key);
              }}
            />
            <div className="inline-flex items-center justify-center gap-1 bg-amber-50 border border-amber-200 rounded px-3 py-1 min-w-[120px] h-6">
              <span className="text-xs text-amber-700 font-medium">
                {fmt.date(value)}
              </span>
            </div>
          </div>
        );
      }

      if (status === 'Rejected') {
        return (
          <StatusBadge
            variant="rejected"
            icon={AlertCircle}
            text="Rejected"
          />
        );
      }
      
      if (value) {
        return (
          <StatusBadge
            variant="completed"
            icon={CheckCircle}
            text={fmt.date(value)}
          />
        );
      }
      
      return (
        <StatusBadge
          variant="pending"
          icon={Clock}
          text="Pending"
          onMouseDown={employee.awaiting ? undefined : (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsMouseDownInProgress(true);
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const position = { x: rect.left + rect.width / 2, y: rect.bottom + 8 };
            setPopupPosition(position);
            setCurrentPopupEmployee(employee);
            setCurrentPopupFieldKey(fieldKey);
            setOpenDatePicker(key);
            // Reset the flag after a short delay
            setTimeout(() => setIsMouseDownInProgress(false), 100);
          }}
          disabled={employee.awaiting}
        />
      );
    }

    // Award columns are read-only
    if (fieldKey === 'secureCareAwarded') {
      const awardStatus = fmt.awarded(employee.secureCareAwarded, employee.secureCareAwardedDate);
      const isPending = awardStatus === 'Pending';
      
      return (
        <StatusBadge
          variant={isPending ? 'pending' : 'awarded'}
          icon={isPending ? Clock : CheckCircle}
          text={awardStatus}
        />
      );
    }

    // Regular training items with schedule/complete workflow
    const scheduleFieldKey = ScheduleFieldMapping[fieldKey];
    const scheduledValue = scheduleFieldKey ? employee[scheduleFieldKey] : null;
           
    const status = fmt.scheduledOrDone(scheduledValue, value);
    
    if (value) {
      return (
        <StatusBadge
          variant="completed"
          icon={CheckCircle}
          text={fmt.date(value)}
        />
      );
    }
        
    if (scheduledValue) {
      return (
        <div className="flex flex-col items-center gap-1 w-full">
          <StatusBadge
            variant="scheduled"
            icon={Clock}
            text="Scheduled"
            onMouseDown={conferenceRejected ? undefined : (e) => {
              e.preventDefault();
              e.stopPropagation();
              const rect = (e.target as HTMLElement).getBoundingClientRect();
              setPopupPosition({ x: rect.left + rect.width / 2, y: rect.bottom + 8 });
              setCurrentPopupEmployee(employee);
              setCurrentPopupFieldKey(fieldKey);
              // Don't set openDatePicker for scheduled items - let the render logic handle which popup to show
            }}
            disabled={conferenceRejected}
          />
          <div className="inline-flex items-center justify-center gap-1 bg-yellow-50 border border-yellow-200 rounded px-3 py-1 min-w-[120px] h-6">
            <span className="text-xs text-yellow-700 font-medium">
              {fmt.date(scheduledValue)}
            </span>
          </div>
        </div>
      );
    }
         
    return (
      <StatusBadge
        variant="pending"
        icon={Clock}
        text={isScheduling ? 'Scheduling...' : 'Pending'}
        onMouseDown={conferenceRejected || employee.awaiting ? undefined : (e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsMouseDownInProgress(true);
          const rect = (e.target as HTMLElement).getBoundingClientRect();
          const position = { x: rect.left + rect.width / 2, y: rect.bottom + 8 };
          setPopupPosition(position);
          setCurrentPopupEmployee(employee);
          setCurrentPopupFieldKey(fieldKey);
          setOpenDatePicker(key);
          // Reset the flag after a short delay
          setTimeout(() => setIsMouseDownInProgress(false), 100);
        }}
        disabled={isScheduling || conferenceRejected || employee.awaiting}
      />
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
             {/* Left side - Search Field */}
             <div className="flex items-center pt-5">
               <div className="relative">
                 <ShineBorder
                   borderWidth={1}
                   duration={20}
                   shineColor={["#8b5cf6", "#a855f7", "#c084fc"]}
                   className="rounded-lg"
                 />
                 <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                   <div className="flex items-center gap-2">
                     <Filter className="w-4 h-4 text-purple-600" />
                     <span className="text-sm font-medium text-purple-900">Search:</span>
                   </div>
                   <div className="relative w-[200px]">
                     <Input
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       onFocus={(e) => e.currentTarget.select()}
                       placeholder="Employee name or ID"
                       className="h-8 text-sm pr-8 bg-white border-purple-200 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                     />
                     {searchQuery && (
                       <button
                         onClick={() => setSearchQuery('')}
                         className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                       >
                         <X className="w-4 h-4" />
                       </button>
                     )}
                   </div>
                 </div>
               </div>
             </div>
             
             {/* Right side - Show Columns with Clear Filters overlay */}
             <div className="relative flex items-end pt-5">
               {/* Enhanced Column Visibility Controls (only for levels 2-5) */}
               {currentLevel !== 'Level 1' && (
                 <div className="relative">
                   <ShineBorder
                     borderWidth={1}
                     duration={20}
                     shineColor={["#8b5cf6", "#a855f7", "#c084fc"]}
                     className="rounded-lg"
                   />
                   <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                     <div className="flex items-center gap-2">
                       <Filter className="w-4 h-4 text-purple-600" />
                       <span className="text-sm font-medium text-purple-900">Show Columns:</span>
                     </div>
                     <div className="flex items-center gap-4">
                       <motion.div
                         whileHover={{ scale: 1.05 }}
                         whileTap={{ scale: 0.95 }}
                         className="flex items-center gap-2"
                       >
                         <input
                           type="checkbox"
                           id="show-notes"
                           checked={showNotesColumn}
                           onChange={(e) => setShowNotesColumn(e.target.checked)}
                           className="w-4 h-4 text-cyan-600 bg-white border-cyan-300 rounded focus:ring-cyan-500 focus:ring-2"
                         />
                         <label htmlFor="show-notes" className="flex items-center gap-1 text-sm font-medium text-cyan-700 cursor-pointer">
                           <MessageSquare className="w-3 h-3" />
                           Notes
                         </label>
                       </motion.div>
                       <motion.div
                         whileHover={{ scale: 1.05 }}
                         whileTap={{ scale: 0.95 }}
                         className="flex items-center gap-2"
                       >
                         <input
                           type="checkbox"
                           id="show-advisor"
                           checked={showAdvisorColumn}
                           onChange={(e) => setShowAdvisorColumn(e.target.checked)}
                           className="w-4 h-4 text-purple-600 bg-white border-purple-300 rounded focus:ring-purple-500 focus:ring-2"
                         />
                         <label htmlFor="show-advisor" className="flex items-center gap-1 text-sm font-medium text-purple-700 cursor-pointer">
                           <UserCheck className="w-3 h-3" />
                           Advisor
                         </label>
                       </motion.div>
                     </div>
                   </div>
                 </div>
               )}

               {/* Clear filters button - positioned absolutely over the show columns */}
               {isAnyFilterActive && (
                 <div className="absolute -top-4 -right-2 z-10">
                   <Button
                     variant="default"
                     size="sm"
                     onClick={clearFilters}
                     className="h-7 sm:h-8 px-2 sm:px-3 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg text-xs sm:text-sm"
                   >
                     <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                     <span className="hidden sm:inline">Clear filters</span>
                     <span className="sm:hidden">Clear</span>
                     <span className="ml-1 sm:ml-2 inline-flex items-center justify-center rounded-full bg-white/20 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[10px] font-medium">
                       {activeFilterCount}
                     </span>
                   </Button>
                 </div>
               )}
             </div>
          </div>
          <div className="px-6">
                     <Table className="table-fixed w-full">
                       <TableHeader>
                         <TableRow className="bg-purple-100 border-b border-purple-200">
                  {filteredColumns.map((column, index) => (
                    <TableHead 
                      key={index} 
                      className={`font-bold text-purple-900 py-2 px-4 bg-purple-100 text-base whitespace-pre-line text-center align-middle ${
                        index === 0 ? "w-[12%]" : 
                        index === 1 ? "w-[8%]" : // Facility column - reduced width
                        index === 2 ? "w-[6%]" : // Area column - reduced width
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
                        {index > 2 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 px-1 mt-1 flex-shrink-0">
                                <Filter className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 max-h-[320px] overflow-y-auto">
                              {column === 'Notes' ? (
                                <>
                                  <DropdownMenuLabel>Filter by Notes</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuRadioGroup
                                    value={reqStatusFilters[currentFieldMapping[column]] || 'all'}
                                    onValueChange={(v) => {
                                      const fieldKey = currentFieldMapping[column];
                                      if (fieldKey) {
                                        setReqStatusFilters(prev => ({ ...prev, [fieldKey]: v }));
                                      }
                                    }}
                                  >
                                    <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="empty">Empty</DropdownMenuRadioItem>
                                    {NOTES_OPTIONS.filter(o => o.value !== '').map(o => (
                                      <DropdownMenuRadioItem key={o.value} value={o.value}>{o.label}</DropdownMenuRadioItem>
                                    ))}
                                  </DropdownMenuRadioGroup>
                                </>
                              ) : column === 'Advisor' ? (
                                <>
                                  <DropdownMenuLabel>Filter by Advisor</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuRadioGroup
                                    value={reqStatusFilters[currentFieldMapping[column]] || 'all'}
                                    onValueChange={(v) => {
                                      const fieldKey = currentFieldMapping[column];
                                      if (fieldKey) {
                                        setReqStatusFilters(prev => ({ ...prev, [fieldKey]: v }));
                                      }
                                    }}
                                  >
                                    <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="unassigned">Unassigned</DropdownMenuRadioItem>
                                    <DropdownMenuRadioItem value="assigned">Assigned</DropdownMenuRadioItem>
                                    {advisors.map(a => (
                                      <DropdownMenuRadioItem key={a.advisorId} value={String(a.advisorId)}>
                                        {a.fullName}
                                      </DropdownMenuRadioItem>
                                    ))}
                                  </DropdownMenuRadioGroup>
                                </>
                              ) : (
                                <>
                                  <DropdownMenuLabel>Status</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuRadioGroup
                                    value={reqStatusFilters[currentFieldMapping[column]] || 'all'}
                                    onValueChange={(v) => {
                                      const fieldKey = currentFieldMapping[column];
                                      if (fieldKey) {
                                        setReqStatusFilters(prev => ({ ...prev, [fieldKey]: v }));
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
                                </>
                              )}
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
                   <div className="flex-1 overflow-visible min-h-0">
                     <Table>
                       <TableBody>
                          {filteredEmployees.map((employee, index) => (
                             <TableRow key={employee.employeeId} className={`${index % 2 === 0 ? 'bg-white' : 'bg-purple-50/30'} hover:bg-purple-50/60 transition-all duration-200 border-b border-purple-100`}>
                              {filteredColumns.map((column, colIndex) => {
                                const fieldKey = currentFieldMapping[column];
                                
                                                                 if (colIndex === 0) { // Employee column
                                   return (
                                     <TableCell key={colIndex} className="py-2 px-4 w-[12%] text-center">
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
                                     <TableCell key={colIndex} className="py-2 px-4 w-[8%] text-center">
                                  <div className="flex justify-center">
                                    <div className="bg-purple-100 rounded-lg px-2 py-0.5 inline-block">
                                         <span className="text-sm font-medium text-purple-700">{employee.facility || employee.Facility}</span>
                                    </div>
                                  </div>
                                </TableCell>
                                   );
                                } else if (colIndex === 2) { // Area column
                                   return (
                                     <TableCell key={colIndex} className="py-2 px-4 w-[6%] text-center">
                                  <div className="flex justify-center">
                                    <div className="bg-lavender-100 rounded-lg px-2 py-0.5 inline-block">
                                         <span className="text-sm font-medium text-lavender-700">{employee.area || employee.Area}</span>
                                    </div>
                                  </div>
                                </TableCell>
                                   );
                                } else if (column === 'Notes') { // Enhanced Notes column with badge UI and floating dropdown
                                   const currentNotes = employee.notes || '';
                                   const selectedNoteOption = NOTES_OPTIONS.find(option => option.value === currentNotes);
                                   const isNotesDropdownOpen = notesDropdownOpen === employee.employeeId.toString();
                                   
                                   return (
                                     <TableCell key={colIndex} className="py-2 px-4 w-[12%] text-center">
                                       <div className="flex justify-center">
                                         <div className="relative" data-dropdown>
                                           <StatusBadge
                                             variant="notes"
                                             icon={MessageSquare}
                                             text={selectedNoteOption?.label || 'Add Notes'}
                                             onClick={(e) => {
                                               const rect = e.currentTarget.getBoundingClientRect();
                                               const viewportHeight = window.innerHeight;
                                               const dropdownHeight = 200; // Approximate dropdown height
                                               const spaceBelow = viewportHeight - rect.bottom;
                                               const spaceAbove = rect.top;
                                               
                                               // Position above if not enough space below, otherwise below
                                               const shouldPositionAbove = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
                                               
                                               setNotesPopupPosition({
                                                 x: rect.left + rect.width / 2,
                                                 y: shouldPositionAbove ? rect.top - 8 : rect.bottom + 8,
                                                 positionAbove: shouldPositionAbove
                                               });
                                               setNotesDropdownOpen(isNotesDropdownOpen ? null : employee.employeeId.toString());
                                             }}
                                           />
                                         </div>
                                       </div>
                                       
                                       {/* Floating Notes Dropdown */}
                                       {isNotesDropdownOpen && notesPopupPosition && createPortal(
                                         <div 
                                           className="fixed z-[9999] bg-white border border-cyan-200 rounded-lg shadow-xl p-1 min-w-[180px] max-h-[200px] overflow-y-auto"
                                           style={{
                                             left: notesPopupPosition.x - 90, // Center the dropdown
                                             top: notesPopupPosition.positionAbove ? notesPopupPosition.y - 200 : notesPopupPosition.y,
                                             transform: notesPopupPosition.positionAbove ? 'translateY(-100%)' : 'none'
                                           }}
                                           data-dropdown
                                         >
                                           {NOTES_OPTIONS.map((option) => (
                                             <div
                                               key={option.value}
                                               className="px-3 py-2 text-sm cursor-pointer hover:bg-cyan-50 rounded transition-colors"
                                               onClick={() => {
                                                 handleSaveNotes(employee.employeeId.toString(), option.value);
                                                 setNotesDropdownOpen(null);
                                                 setNotesPopupPosition(null);
                                               }}
                                             >
                                               {option.label}
                                             </div>
                                           ))}
                                         </div>,
                                         document.body
                                       )}
                                     </TableCell>
                                   );
                                } else if (column === 'Advisor') { // Enhanced Advisor column with badge UI and floating dropdown
                                   const currentAdvisor = advisors.find(a => a.advisorId === employee.advisorId);
                                   const isAdvisorDropdownOpen = advisorDropdownOpen === employee.employeeId.toString();
                                   
                                   return (
                                     <TableCell key={colIndex} className="py-2 px-4 w-[12%] text-center">
                                       <div className="flex justify-center">
                                         <div className="relative" data-dropdown>
                                           <StatusBadge
                                             variant="advisor"
                                             icon={UserCheck}
                                             text={employee.advisorName || currentAdvisor?.fullName || 'Add advisor'}
                                             onClick={(e) => {
                                               const rect = e.currentTarget.getBoundingClientRect();
                                               const viewportHeight = window.innerHeight;
                                               const dropdownHeight = 250; // Approximate dropdown height (larger for advisor list)
                                               const spaceBelow = viewportHeight - rect.bottom;
                                               const spaceAbove = rect.top;
                                               
                                               // Position above if not enough space below, otherwise below
                                               const shouldPositionAbove = spaceBelow < dropdownHeight && spaceAbove > dropdownHeight;
                                               
                                               setAdvisorPopupPosition({
                                                 x: rect.left + rect.width / 2,
                                                 y: shouldPositionAbove ? rect.top - 8 : rect.bottom + 8,
                                                 positionAbove: shouldPositionAbove
                                               });
                                               setAdvisorDropdownOpen(isAdvisorDropdownOpen ? null : employee.employeeId.toString());
                                             }}
                                           />
                                         </div>
                                       </div>
                                       
                                       {/* Floating Advisor Dropdown */}
                                       {isAdvisorDropdownOpen && advisorPopupPosition && createPortal(
                                         <div 
                                           className="fixed z-[9999] bg-white border border-purple-200 rounded-lg shadow-xl p-1 min-w-[200px] max-h-[250px] overflow-y-auto"
                                           style={{
                                             left: advisorPopupPosition.x - 100, // Center the dropdown
                                             top: advisorPopupPosition.positionAbove ? advisorPopupPosition.y - 250 : advisorPopupPosition.y,
                                             transform: advisorPopupPosition.positionAbove ? 'translateY(-100%)' : 'none'
                                           }}
                                           data-dropdown
                                         >
                                           <div
                                             className="px-3 py-2 text-sm cursor-pointer hover:bg-purple-50 rounded transition-colors"
                                             onClick={() => {
                                               handleSaveAdvisor(employee.employeeId.toString(), 'none');
                                               setAdvisorDropdownOpen(null);
                                               setAdvisorPopupPosition(null);
                                             }}
                                           >
                                             No advisor assigned
                                           </div>
                                           {advisors.map((advisor) => (
                                             <div
                                               key={advisor.advisorId}
                                               className="px-3 py-2 text-sm cursor-pointer hover:bg-purple-50 rounded transition-colors"
                                               onClick={() => {
                                                 handleSaveAdvisor(employee.employeeId.toString(), advisor.advisorId.toString());
                                                 setAdvisorDropdownOpen(null);
                                                 setAdvisorPopupPosition(null);
                                               }}
                                             >
                                               {advisor.fullName}
                                             </div>
                                           ))}
                                         </div>,
                                         document.body
                                       )}
                                     </TableCell>
                                   );
                                } else { // Training requirement columns
                                   return (
                                     <TableCell key={colIndex} className={`py-2 px-4 text-center ${
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
                   <div className="flex-shrink-0 border-t border-gray-200 bg-white px-6 py-2">
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
               onMouseDown={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 
                 // Store employee ID before clearing state
                 // Handle case where currentPopupEmployee might be just the ID or the full object
                 const employeeId = typeof currentPopupEmployee === 'object' 
                   ? currentPopupEmployee?.employeeId 
                   : currentPopupEmployee;
                 
                 // Approve the conference FIRST, then close popup
                 if (employeeId) {
                   approveConference({ employeeId: employeeId.toString() });
                   
                   // Close the popup immediately after API call is initiated
                   setOpenDatePicker(null);
                   setPopupPosition(null);
                   setCurrentPopupEmployee(null);
                 } else {
                   console.error('Training page: No employee ID available for approval');
                 }
               }}
               disabled={isApprovingConference}
               title={isApprovingConference ? 'Approving...' : 'Click to approve'}
               style={{ pointerEvents: 'auto', zIndex: 10000 }}
               className="inline-flex items-center justify-center gap-2 bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <CheckCircle className="w-4 h-4" />
               {isApprovingConference ? 'Approving...' : 'Approve'}
             </button>
             <button
               onMouseDown={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 
                 // Store employee ID before clearing state
                 // Handle case where currentPopupEmployee might be just the ID or the full object
                 const employeeId = typeof currentPopupEmployee === 'object' 
                   ? currentPopupEmployee?.employeeId 
                   : currentPopupEmployee;
                 
                 // Reject the conference FIRST, then close popup
                 if (employeeId) {
                   rejectConference({ employeeId: employeeId.toString() });
                   
                   // Close the popup immediately after API call is initiated
                   setOpenDatePicker(null);
                   setPopupPosition(null);
                   setCurrentPopupEmployee(null);
                 } else {
                   console.error('Training page: No employee ID available for rejection');
                 }
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
       {popupPosition && currentPopupEmployee && currentPopupFieldKey && 
        (!openDatePicker || (!openDatePicker.includes('conferenceCompleted') && !openDatePicker.startsWith('reschedule-'))) &&
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
               onMouseDown={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 // Store data before clearing state
                 const employeeId = currentPopupEmployee?.employeeId;
                 const requirementKey = currentPopupFieldKey;
                 
                 // Close the popup immediately for smooth UX
                 setOpenDatePicker(null);
                 setPopupPosition(null);
                 setCurrentPopupEmployee(null);
                 setCurrentPopupFieldKey(null);
                 
                 // Complete the training
                 if (employeeId && requirementKey) {
                   completeTraining({ employeeId, requirementKey });
                 }
               }}
               disabled={isCompleting}
               className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:from-blue-600 hover:to-indigo-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <CheckCircle className="w-4 h-4" />
               {isCompleting ? 'Completing...' : 'Mark Complete'}
             </button>
             <button
               onMouseDown={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
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
                 // Store data before clearing state
                 const employeeId = currentPopupEmployee?.employeeId;
                 const requirementKey = currentPopupFieldKey;
                 
                 // Close the popup immediately for smooth UX
                 setOpenDatePicker(null);
                 setPopupPosition(null);
                 setCurrentPopupEmployee(null);
                 setCurrentPopupFieldKey(null);
                 
                 // Reschedule the training
                 if (employeeId && requirementKey) {
                   rescheduleTraining({ employeeId, requirementKey, date });
                 }
               }
             }}
             placeholder="Reschedule date"
           />
         </div>,
         document.body
       )}
       
       {/* Portal popup for Schedule Date Picker */}
       {(() => {
         // Simplified render condition - just check if we have the basic requirements
         const shouldRender = openDatePicker && 
           popupPosition && 
           currentPopupEmployee && 
           currentPopupFieldKey && 
           !openDatePicker.includes('conferenceCompleted') && 
           !openDatePicker.startsWith('reschedule-');
         
         
         return shouldRender;
       })() && createPortal(
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
                 // Store data before clearing state
                 const employeeId = currentPopupEmployee?.employeeId;
                 const requirementKey = currentPopupFieldKey;
                 
                 // Close the popup immediately for smooth UX
                 setOpenDatePicker(null);
                 setPopupPosition(null);
                 setCurrentPopupEmployee(null);
                 setCurrentPopupFieldKey(null);
                 
                 // Schedule the training
                 if (employeeId && requirementKey) {
                   scheduleTraining({ employeeId, requirementKey, date });
                 } else {
                   console.error('Missing data for scheduling:', { employeeId, requirementKey, date });
                 }
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

