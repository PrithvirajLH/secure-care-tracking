import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePicker } from "@/components/ui/date-picker";
import { Calendar as InlineCalendar } from "@/components/ui/calendar";
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
  ChevronDown,
  ListChecks,
  CalendarPlus,
  Square,
  CheckSquare,
  Check,
  Search
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
import { MultiSelectCombobox, type MultiSelectOption } from "@/components/ui/multi-select-combobox";

import { toast } from "sonner";
import { useTrainingData } from "@/hooks/useTrainingData";
import EmployeeDetailModal from "@/components/EmployeeDetailModal";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { useEmployees, useEmployeeStats, useTrainingEmployees, useAdvisors } from "@/hooks/useEmployees";
import PageHeader from "@/components/PageHeader";
import { trainingAPI } from "@/services/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEditCompletedDatePermission } from "@/hooks/usePermissions";

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

// Helper function to get award type priority (lower number = higher priority)
const getAwardTypePriority = (awardType: string | null | undefined): number => {
  if (!awardType) return 99;
  
  switch (awardType) {
    case 'Coach': return 1;
    case 'Consultant': return 2;
    case 'Level 3': return 3;
    case 'Level 2': return 4;
    case 'Level 1': return 5;
    default: return 99;
  }
};

interface LevelStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overdue: number;
  completionRate: number;
}

export default function Training() {
  const queryClient = useQueryClient();
  
  // Check permissions for editing completed dates
  const { data: permissionData, isLoading: isLoadingPermissions, error: permissionError } = useEditCompletedDatePermission();
  // Only enable if query is loaded, no error, and permission is explicitly true
  const canEditCompletedDate = !isLoadingPermissions && !permissionError && (permissionData?.hasPermission === true);
  
  // URL-based tab persistence
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    return searchParams.get('level') || "level-1";
  });
  
  // Update URL when tab changes and set default sort per level (L1: latest, others: conference)
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setSearchParams({ level: newTab });
    const level = getLevelFromTabKey(newTab);
    const nextSort = level === 'Level 1' ? 'latest' : 'conference';
    setSortBy(nextSort);
    setSortOrder('desc');
    setCurrentPage(1);
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemsPerPage] = useState(100);
  const [facilityFilter, setFacilityFilter] = useState<string[]>([]);
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [reqStatusFilters, setReqStatusFilters] = useState<Record<string, string>>({});
  
  // Set default sort based on initial active tab (L1: latest, others: conference)
  const [sortBy, setSortBy] = useState<string>(() => {
    const initialLevel = getLevelFromTabKey(searchParams.get('level') || "level-1");
    return initialLevel === 'Level 1' ? 'latest' : 'conference';
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>("desc");

  // Custom handler to update sortBy and sortOrder together
  const handleSortByChange = (newSortBy: string) => {
    setSortBy(newSortBy);
    
    // Set sort order based on the sort option
    if (newSortBy === 'name' || newSortBy === 'facility') {
      setSortOrder('asc'); // A-Z should be ascending
    } else if (newSortBy === 'latestCompletion') {
      setSortOrder('desc');
    } else {
      setSortOrder('desc'); // Latest should be descending
    }

    // Always reset to first page on sort change so slicing starts at correct boundary
    setCurrentPage(1);
  };
  
  // Enhanced UI state
  // Use React Query for advisors data
  const { data: advisors = [], isLoading: isLoadingAdvisors, error: advisorsError } = useAdvisors();
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [editingAdvisor, setEditingAdvisor] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState<string>("");
  const [tempAdvisor, setTempAdvisor] = useState<string>("");
  const [notesDropdownOpen, setNotesDropdownOpen] = useState<string | null>(null);
  const [advisorDropdownOpen, setAdvisorDropdownOpen] = useState<string | null>(null);
  const [notesDropdownPosition, setNotesDropdownPosition] = useState<{x: number, y: number} | null>(null);
  const [advisorDropdownPosition, setAdvisorDropdownPosition] = useState<{x: number, y: number, positionAbove?: boolean} | null>(null);
  const [scheduledDates, setScheduledDates] = useState<{[key: string]: Date}>({});
  const [completedDates, setCompletedDates] = useState<{[key: string]: Date}>({});
  const [openDatePicker, setOpenDatePicker] = useState<string | null>(null);
  // Controls the "Filter by Completion Date" dropdown per column
  const [openDateFilterColumn, setOpenDateFilterColumn] = useState<string | null>(null);

  // Individual click outside handler for Notes dropdown
  useEffect(() => {
    if (!notesDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-notes-dropdown]')) {
        setNotesDropdownOpen(null);
        setNotesDropdownPosition(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [notesDropdownOpen]);

  // Individual click outside handler for Advisor dropdown
  useEffect(() => {
    if (!advisorDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-advisor-dropdown]')) {
        setAdvisorDropdownOpen(null);
        setAdvisorDropdownPosition(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [advisorDropdownOpen]);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [popupPosition, setPopupPosition] = useState<{x: number, y: number, positionAbove?: boolean} | null>(null);
  const [currentPopupEmployee, setCurrentPopupEmployee] = useState<any>(null);
  const [currentPopupFieldKey, setCurrentPopupFieldKey] = useState<string | null>(null);
  const [isButtonClicking, setIsButtonClicking] = useState<boolean>(false);
  const [isMouseDownInProgress, setIsMouseDownInProgress] = useState<boolean>(false);
  
  // Search state - manual trigger (button or Enter key)
  const [searchQuery, setSearchQuery] = useState<string>(''); // Input field value
  const [committedSearchQuery, setCommittedSearchQuery] = useState<string>(''); // Actually applied to filter
  
  // Function to trigger the search
  const handleSearch = useCallback(() => {
    setCommittedSearchQuery(searchQuery.trim());
  }, [searchQuery]);
  
  // Handle Enter key in search input
  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }, [handleSearch]);
  
  // Clear search
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setCommittedSearchQuery('');
  }, []);
  
  // Bulk scheduling state
  const [isBulkMode, setIsBulkMode] = useState<boolean>(false);
  const [selectedPendingItems, setSelectedPendingItems] = useState<Set<string>>(new Set());
  const [bulkScheduleDate, setBulkScheduleDate] = useState<Date | null>(null);
  const [isBulkScheduling, setIsBulkScheduling] = useState<boolean>(false);
  
  // Date filtering state
  const [dateFilter, setDateFilter] = useState<{
    date: Date | null;
    column: string | null;
  }>({
    date: null,
    column: null
  });
  
  
  // Column visibility controls with localStorage persistence
  const [showNotesColumn, setShowNotesColumn] = useState<boolean>(() => {
    const saved = localStorage.getItem('showNotesColumn');
    return saved ? JSON.parse(saved) : false;
  });
  const [showAdvisorColumn, setShowAdvisorColumn] = useState<boolean>(() => {
    const saved = localStorage.getItem('showAdvisorColumn');
    return saved ? JSON.parse(saved) : false;
  });
  
  // Individual click outside handler for Conference approval popup
  useEffect(() => {
    if (!openDatePicker || !openDatePicker.includes('conferenceCompleted')) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-conference-popup]')) {
        setOpenDatePicker(null);
        setPopupPosition(null);
        setCurrentPopupEmployee(null);
        setCurrentPopupFieldKey(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDatePicker]);

  // Individual click outside handler for Mark Complete/Reschedule popup
  useEffect(() => {
    if (!popupPosition || !currentPopupEmployee || !currentPopupFieldKey) return;
    if (openDatePicker && (openDatePicker.includes('conferenceCompleted') || openDatePicker.startsWith('reschedule-') || openDatePicker.startsWith('edit-completed-'))) return;
    if (!ScheduleFieldMapping[currentPopupFieldKey] || !currentPopupEmployee[ScheduleFieldMapping[currentPopupFieldKey]]) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-complete-reschedule-popup]')) {
        setPopupPosition(null);
        setCurrentPopupEmployee(null);
        setCurrentPopupFieldKey(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [popupPosition, currentPopupEmployee, currentPopupFieldKey, openDatePicker]);

  // Individual click outside handler for Edit Completed Date Picker popup
  useEffect(() => {
    if (!openDatePicker || !openDatePicker.startsWith('edit-completed-')) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-edit-completed-popup]')) {
        setOpenDatePicker(null);
        setPopupPosition(null);
        setCurrentPopupEmployee(null);
        setCurrentPopupFieldKey(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDatePicker]);

  // Individual click outside handler for Reschedule Date Picker popup
  useEffect(() => {
    if (!openDatePicker || !openDatePicker.startsWith('reschedule-')) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-reschedule-popup]')) {
        setOpenDatePicker(null);
        setPopupPosition(null);
        setCurrentPopupEmployee(null);
        setCurrentPopupFieldKey(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDatePicker]);

  // Individual click outside handler for Schedule Date Picker popup
  useEffect(() => {
    if (!openDatePicker || openDatePicker.includes('conferenceCompleted') || openDatePicker.startsWith('reschedule-') || openDatePicker.startsWith('edit-completed-')) return;
    if (!popupPosition || !currentPopupEmployee || !currentPopupFieldKey) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-schedule-popup]')) {
        setOpenDatePicker(null);
        setPopupPosition(null);
        setCurrentPopupEmployee(null);
        setCurrentPopupFieldKey(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDatePicker, popupPosition, currentPopupEmployee, currentPopupFieldKey]);
  
  // Training data hook for database operations
  const {
    scheduleTraining: baseScheduleTraining,
    scheduleTrainingAsync: baseScheduleTrainingAsync,
    completeTraining: baseCompleteTraining,
    editCompletedDate: baseEditCompletedDate,
    editCompletedDateAsync: baseEditCompletedDateAsync,
    rescheduleTraining: baseRescheduleTraining,
    approveConference: baseApproveConference,
    rejectConference: baseRejectConference,
    isScheduling,
    isCompleting,
    isEditingCompleted,
    isRescheduling,
    isApprovingConference,
    isRejectingConference,
  } = useTrainingData();

  // Wrapper functions to trigger refetch after mutations
  const scheduleTraining = async (params: any) => {
    baseScheduleTraining(params);
    // Wait a bit for the mutation to complete and trigger its refetch, then force our local refetch
    await new Promise(resolve => setTimeout(resolve, 500));
    refetch();
  };

  const completeTraining = async (params: any) => {
    baseCompleteTraining(params);
    await new Promise(resolve => setTimeout(resolve, 500));
    refetch();
  };

  const editCompletedDate = async (params: any) => {
    if (baseEditCompletedDateAsync) {
      await baseEditCompletedDateAsync(params);
    } else {
      baseEditCompletedDate(params);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
    refetch();
  };

  const rescheduleTraining = async (params: any) => {
    baseRescheduleTraining(params);
    await new Promise(resolve => setTimeout(resolve, 500));
    refetch();
  };

  const approveConference = async (params: any) => {
    baseApproveConference(params);
    await new Promise(resolve => setTimeout(resolve, 500));
    refetch();
  };

  const rejectConference = async (params: any) => {
    baseRejectConference(params);
    await new Promise(resolve => setTimeout(resolve, 500));
    refetch();
  };

  // Toggle bulk mode handler - clears selections when toggling off
  const toggleBulkMode = () => {
    if (isBulkMode) {
      // Clear selections when toggling off
      setSelectedPendingItems(new Set());
      setBulkScheduleDate(null);
    }
    setIsBulkMode(!isBulkMode);
  };

  // Toggle selection of a pending item
  const togglePendingItemSelection = (employeeId: string, fieldKey: string) => {
    const key = `${employeeId}-${fieldKey}`;
    setSelectedPendingItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Bulk schedule training function
  const bulkScheduleTraining = async () => {
    if (!bulkScheduleDate || selectedPendingItems.size === 0) {
      toast.error('Please select a date and at least one item to schedule');
      return;
    }

    setIsBulkScheduling(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Convert selected items to array and process each
      // IMPORTANT: Call API directly to avoid mutation onSuccess race conditions
      // This prevents each mutation's onSuccess from refetching individually,
      // which causes race conditions and prevents proper UI updates with filters
      const itemsToSchedule = Array.from(selectedPendingItems);
      
      for (const item of itemsToSchedule) {
        const [employeeId, fieldKey] = item.split('-');
        try {
          // Map frontend requirement key to database column name
          let scheduleColumn = ScheduleFieldMapping[fieldKey] || `schedule${fieldKey}`;
          
          // Convert frontend field names to database column names for API calls
          if (scheduleColumn === 'scheduleSession1') scheduleColumn = 'scheduleSession#1';
          if (scheduleColumn === 'scheduleSession2') scheduleColumn = 'scheduleSession#2';
          if (scheduleColumn === 'scheduleSession3') scheduleColumn = 'scheduleSession#3';
          
          // Call API directly (bypassing mutation to avoid onSuccess race conditions)
          await trainingAPI.scheduleTraining(employeeId, scheduleColumn, bulkScheduleDate);
          successCount++;
        } catch (error) {
          console.error(`Failed to schedule ${item}:`, error);
          errorCount++;
        }
      }

      // Wait a moment for all backend operations to fully complete
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Construct the exact query key for the current query (with filters)
      const currentFiltersString = JSON.stringify(filters);
      const exactQueryKey = ['employees-training', filters.level, currentPage, currentFiltersString];
      
      // Mark the exact query as stale to refetch without clearing cached rows
      await queryClient.invalidateQueries({ queryKey: exactQueryKey });
      
      // Also invalidate all training queries to ensure consistency
      queryClient.invalidateQueries({
        queryKey: ['employees-training']
      });
      queryClient.invalidateQueries({
        queryKey: ['employees-unique']
      });
      
      // Wait a moment for cache operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Explicitly refetch the exact query using the query key
      // Use 'all' type to refetch even if query is not currently active
      await queryClient.refetchQueries({ 
        queryKey: exactQueryKey,
        type: 'all'
      });
      
      // Also trigger the local refetch to ensure UI updates
      // This will use the current filters automatically
      await refetch();

      // Show results (single toast for bulk operation)
      if (errorCount === 0) {
        toast.success(`Successfully scheduled ${successCount} item${successCount !== 1 ? 's' : ''}`);
      } else {
        toast.warning(`Scheduled ${successCount} items, ${errorCount} failed`);
      }

      // Clear selections and exit bulk mode
      setSelectedPendingItems(new Set());
      setBulkScheduleDate(null);
      setIsBulkMode(false);
    } catch (error) {
      console.error('Bulk scheduling error:', error);
      toast.error('Failed to complete bulk scheduling');
    } finally {
      setIsBulkScheduling(false);
    }
  };

  // Advisors are now loaded via React Query useAdvisors hook

  // Enhanced notes editing handlers
  const handleEditNotes = (employeeId: string, currentNotes: string) => {
    setEditingNotes(employeeId);
    setTempNotes(currentNotes || '');
  };

  const handleSaveNotes = async (employeeId: string, notesValue?: string) => {
    try {
      const valueToSave = notesValue !== undefined ? notesValue : tempNotes;
      const result = await trainingAPI.updateEmployeeNotes(employeeId, valueToSave);
      toast.success('Notes updated successfully');
      setEditingNotes(null);
      setTempNotes('');
      // Invalidate queries to refresh data without page reload
      await queryClient.invalidateQueries({ queryKey: ['employees-training'] });
      await queryClient.invalidateQueries({ queryKey: ['employees-unique'] });
    } catch (error) {
      console.error('Failed to update notes - Full error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
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
      const result = await trainingAPI.updateEmployeeAdvisor(employeeId, advisorId);
      toast.success('Advisor updated successfully');
      setEditingAdvisor(null);
      setTempAdvisor('');
      // Invalidate queries to refresh data without page reload
      await queryClient.invalidateQueries({ queryKey: ['employees-training'] });
      await queryClient.invalidateQueries({ queryKey: ['employees-unique'] });
      await queryClient.invalidateQueries({ queryKey: ['advisors'] });
    } catch (error) {
      console.error('Failed to update advisor - Full error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error('Failed to update advisor');
    }
  };

  const handleCancelAdvisor = () => {
    setEditingAdvisor(null);
    setTempAdvisor('none');
  };

  // Get current level configuration first
  const currentLevel: AwardType = getLevelFromTabKey(activeTab);
  const currentLevelConfig = useMemo(() => LevelConfig[currentLevel], [currentLevel]);
  const currentColumns = useMemo(() => LevelColumns[currentLevel], [currentLevel]);
  const currentFieldMapping = useMemo(() => LevelFieldMapping[currentLevel], [currentLevel]);

  // Server-side pagination with filters (includes optional date filter)
  // Consolidated filters definition to avoid circular dependency
  // Uses committedSearchQuery - only updates when user clicks search or presses Enter
  const filters = useMemo(() => ({
    level: activeTab,
    status: 'all', // Changed from 'active' to 'all' to show all employees
    facility: facilityFilter.length > 0 ? facilityFilter : undefined,
    area: areaFilter !== 'all' ? areaFilter : undefined,
    search: committedSearchQuery || undefined, // Server-side search (triggered by button/Enter)
    sortBy: sortBy,
    sortOrder: sortOrder,
    dateField: dateFilter.column ? currentFieldMapping[dateFilter.column] : undefined,
    date: dateFilter.date ? dateFilter.date.toISOString().split('T')[0] : undefined
  }), [activeTab, facilityFilter, areaFilter, committedSearchQuery, sortBy, sortOrder, dateFilter, currentFieldMapping]);

  const {
    employees: allEmployees,
    isLoading,
    error,
    currentPage,
    setCurrentPage,
    totalPages,
    totalEmployees,
    isFetching,
    refetch
  } = useTrainingEmployees(filters, itemsPerPage);

  // Auto-refresh when page becomes visible (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetch]);

  // Scroll to top of page when page changes
  useEffect(() => {
    // Small delay to ensure new data is rendered
    const timeoutId = setTimeout(() => {
      // Scroll to absolute top of the page
      window.scrollTo({ 
        top: 0, 
        left: 0,
        behavior: 'smooth' 
      });
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [currentPage]);

  // Remove duplicate employees - keep one record per employeeNumber + awardType (newest/most relevant)
  // Exception: Show both approved and rejected records for the same employee if they exist
  const currentEmployees = useMemo(() => {
    if (!allEmployees || allEmployees.length === 0) return [];
    
    // Group by employeeNumber + awardType + awaiting status, then select the best record
    const employeeMap = new Map<string, any>();
    
    const getRecencyScore = (emp: any) => {
      // Prefer awarded, then approved (awaiting=0), then most recent conference/completion/assigned, finally highest employeeId
      const awarded = emp.secureCareAwarded ? 1 : 0;
      const approved = (emp.awaiting === 0 || emp.awaiting === false) ? 1 : 0; // Approved status
      const rejected = (emp.awaiting === null) ? -1 : 0; // Rejected status gets negative score
      const dates = [
        emp.secureCareAwardedDate,
        emp.conferenceCompleted,
        emp.completedDate,
        emp.session3,
        emp.session2,
        emp.session1,
        emp.standingVideo,
        emp.sleepingVideo,
        emp.feedGradVideo,
        emp.noHandnoSpeak,
        emp.assignedDate
      ].map(d => (d ? new Date(d).getTime() : 0));
      const maxDate = Math.max(0, ...dates);
      const id = typeof emp.employeeId === 'number' ? emp.employeeId : 0;
      return awarded * 1e15 + approved * 1e12 + rejected * 1e9 + maxDate * 10 + (id % 10);
    };
    
    for (const employee of allEmployees) {
      const employeeNumber = employee.employeeNumber || employee.employeeId;
      if (!employeeNumber) continue;
      
      // Create unique key that includes awaiting status to show both approved and rejected records
      const awaitingStatus = employee.awaiting === null ? 'rejected' : 
                           employee.awaiting === 0 ? 'approved' : 
                           employee.awaiting === 1 ? 'awaiting' : 'unknown';
      const key = `${employeeNumber}-${employee.awardType || 'null'}-${awaitingStatus}`;
      
      const existing = employeeMap.get(key);
      if (!existing) {
        employeeMap.set(key, employee);
        continue;
      }
      if (getRecencyScore(employee) > getRecencyScore(existing)) {
        employeeMap.set(key, employee);
      }
    }
    
    return Array.from(employeeMap.values());
  }, [allEmployees]);

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
  }, [facilityFilter, areaFilter, setCurrentPage]);

  // Server-side statistics
  const { data: levelStats } = useEmployeeStats(activeTab);

  // Sync active tab changes
  useEffect(() => {
    const event = new CustomEvent('levelChange', { detail: { level: activeTab } });
    window.dispatchEvent(event);
    setCurrentPage(1);
    setFacilityFilter([]);
    setAreaFilter('all');
    
    // Set level-specific default sorting
    const currentLevel: AwardType = getLevelFromTabKey(activeTab);
    // Keep existing behavior (no global default to latestCompletion)
    
    const next: Record<string, string> = {};
    filteredColumns.forEach(col => {
      const fieldKey = currentFieldMapping[col];
      if (fieldKey) {
        next[fieldKey] = 'all';
      }
    });
    setReqStatusFilters(next);
  }, [activeTab, setCurrentPage, filteredColumns, currentFieldMapping]);


  // Advisors are automatically loaded via React Query useAdvisors hook

  // Persist column visibility state to localStorage
  useEffect(() => {
    localStorage.setItem('showNotesColumn', JSON.stringify(showNotesColumn));
  }, [showNotesColumn]);

  useEffect(() => {
    localStorage.setItem('showAdvisorColumn', JSON.stringify(showAdvisorColumn));
  }, [showAdvisorColumn]);

  // Note: Using React Query's invalidateQueries instead of custom events for better cache management


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
    
    // Apply search filter first (using committedSearchQuery - the one sent to server)
    if (committedSearchQuery) {
      const searchTerm = committedSearchQuery.toLowerCase();
      filtered = filtered.filter(emp => {
        const name = (emp.name || emp.Employee || '').toLowerCase();
        const employeeNumber = (emp.employeeNumber || emp.employeeId || '').toLowerCase();
        return name.includes(searchTerm) || employeeNumber.includes(searchTerm);
      });
    }
    
    // Apply date filter if active (covers scheduled, completed, awaiting, rejected)
    if (dateFilter.column && dateFilter.date) {
      const fieldKey = currentFieldMapping[dateFilter.column];
      if (fieldKey) {
        filtered = filtered.filter(emp => {
          let dateSource: string | Date | null | undefined = null;

          // For Awarded columns, use the awarded date field if present
          if (fieldKey === 'secureCareAwarded') {
            dateSource = (emp as any).secureCareAwardedDate;
          } else if (fieldKey === 'conferenceCompleted') {
            // Conference: use the conferenceCompleted date for completed/awaiting/rejected
            dateSource = emp[fieldKey];
          } else {
            // Regular training fields: prefer completed date; if not present, use scheduled date
            const completedDate = emp[fieldKey];
            const scheduleField = ScheduleFieldMapping[fieldKey];
            const scheduledDate = scheduleField ? emp[scheduleField] : null;
            dateSource = completedDate || scheduledDate;
          }

          if (!dateSource) return false;

          const empDate = parseDate(dateSource);
          const filterDate = dateFilter.date;
          if (!empDate || !filterDate) return false;

          // Compare dates (ignore time, timezone-safe)
          const empDateOnly = new Date(empDate.getFullYear(), empDate.getMonth(), empDate.getDate());
          const filterDateOnly = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());

          return empDateOnly.getTime() === filterDateOnly.getTime();
        });
      }
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
            // Show only records where notes are empty or NULL
            if (noteValue !== '' && emp.notes !== null && emp.notes !== undefined) return false;
          } else if (want === 'exclude-inactive') {
            // Show everything except Inactive
            if (noteValue === 'Inactive') return false;
          } else {
            if (noteValue !== want) return false;
          }
          continue;
        }

        // Custom filtering for Advisor
        if (column === 'Advisor') {
          const advisorId = emp.advisorId != null ? String(emp.advisorId) : '';
          if (want === 'unassigned') {
            // Show only records where advisor is NULL or empty
            if (emp.advisorId !== null && emp.advisorId !== undefined && advisorId !== '') return false;
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
  }, [currentEmployees, committedSearchQuery, reqStatusFilters, filteredColumns, currentFieldMapping, scheduledDates, completedDates, dateFilter]);

  // Note: search, facility, area, and date filters are handled server-side now
  // isAnyFilterActive only triggers client-side aggregation for filters NOT handled by server
  const isAnyFilterActive = useMemo(() => {
    // Server-side filters (search, facility, area, date) don't require client aggregation
    // Only per-column requirement status filters need client-side processing
    return filteredColumns.some(col => {
      const fieldKey = currentFieldMapping[col];
      return fieldKey && (reqStatusFilters[fieldKey] || 'all') !== 'all';
    });
  }, [reqStatusFilters, filteredColumns, currentFieldMapping]);

  // Aggregate across pages when filters active, until either we collect all filtered rows
  // or reach 100 (single page). If more than 100 exist, keep normal pagination.
  const [mergedEmployees, setMergedEmployees] = useState<any[]>([]);
  const [aggregatedFilteredCount, setAggregatedFilteredCount] = useState<number>(0);
  const [isAggregatingFiltered, setIsAggregatingFiltered] = useState<boolean>(false);
  useEffect(() => {
    let isCancelled = false;
    const fill = async () => {
      // When no filters and not sorting by latestCompletion, just use current page
      if (!isAnyFilterActive && sortBy !== 'latestCompletion') {
        setMergedEmployees(currentEmployees);
        setAggregatedFilteredCount((currentEmployees || []).length);
        setIsAggregatingFiltered(false);
        return;
      }

      setIsAggregatingFiltered(true);
      // Start fresh and fetch ALL pages to support exact 100-per-page filtered pagination
      let accumulated: any[] = [];

      const applyLocalFilters = (list: any[]) => {
        let filtered = list;
        // Apply search (using committedSearchQuery - the one sent to server)
        if (committedSearchQuery) {
          const searchTerm = committedSearchQuery.toLowerCase();
          filtered = filtered.filter(emp => {
            const name = (emp.name || emp.Employee || '').toLowerCase();
            const employeeNumber = String(emp.employeeNumber || emp.employeeId || '').toLowerCase();
            return name.includes(searchTerm) || employeeNumber.includes(searchTerm);
          });
        }
        // Date filter
        if (dateFilter.column && dateFilter.date) {
          const fieldKey = currentFieldMapping[dateFilter.column];
          if (fieldKey) {
            filtered = filtered.filter(emp => {
              let dateSource: any = null;
              if (fieldKey === 'secureCareAwarded') {
                dateSource = (emp as any).secureCareAwardedDate;
              } else if (fieldKey === 'conferenceCompleted') {
                dateSource = emp[fieldKey];
              } else {
                const completedDate = emp[fieldKey];
                const scheduleField = ScheduleFieldMapping[fieldKey];
                const scheduledDate = scheduleField ? emp[scheduleField] : null;
                dateSource = completedDate || scheduledDate;
              }
              if (!dateSource) return false;
              const empDate = parseDate(dateSource);
              const filterDate = dateFilter.date;
              if (!empDate || !filterDate) return false;
              const empDateOnly = new Date(empDate.getFullYear(), empDate.getMonth(), empDate.getDate());
              const filterDateOnly = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());
              return empDateOnly.getTime() === filterDateOnly.getTime();
            });
          }
        }
        // Per-requirement filters
        filtered = filtered.filter(emp => {
          for (const column of filteredColumns) {
            const fieldKey = currentFieldMapping[column];
            if (!fieldKey) continue;
            const want = reqStatusFilters[fieldKey] || 'all';
            if (want === 'all') continue;
            if (column === 'Notes') {
              const noteValue = (emp.notes || '').trim();
              if (want === 'empty') {
                if (noteValue !== '' && emp.notes !== null && emp.notes !== undefined) return false;
              } else if (want === 'exclude-inactive') {
                // Show everything except Inactive
                if (noteValue === 'Inactive') return false;
              } else {
                if (noteValue !== want) return false;
              }
              continue;
            }
            if (column === 'Advisor') {
              const advisorId = emp.advisorId != null ? String(emp.advisorId) : '';
              if (want === 'unassigned') {
                if (emp.advisorId !== null && emp.advisorId !== undefined && advisorId !== '') return false;
              } else {
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
      };

      // Fetch all pages to compute accurate filtered counts
      let nextPage = 1;
      let filteredSoFar = 0;
      while (nextPage <= (totalPages || 0)) {
        try {
          const level = getLevelFromTabKey(activeTab);
          const resp = await trainingAPI.getEmployeesByLevel(level, {
            level: activeTab,
            status: 'all', // Changed from 'active' to 'all' to show all employees
            facility: facilityFilter.length > 0 ? facilityFilter : undefined,
            area: areaFilter !== 'all' ? areaFilter : undefined,
            sortBy: sortBy,
            sortOrder: sortOrder,
            dateField: dateFilter.column ? currentFieldMapping[dateFilter.column] : undefined,
            date: dateFilter.date ? dateFilter.date.toISOString().split('T')[0] : undefined,
            page: nextPage,
            limit: itemsPerPage,
          });
          const nextEmployees = resp?.employees || [];
          accumulated = accumulated.concat(nextEmployees);
          filteredSoFar = applyLocalFilters(accumulated).length;
        } catch (e) {
          break;
        }
        nextPage += 1;
      }

      if (!isCancelled) {
        setMergedEmployees(accumulated);
        setAggregatedFilteredCount(filteredSoFar);
        setIsAggregatingFiltered(false);
      }
    };

    fill();
    return () => {
      isCancelled = true;
    };
  // Note: Removed searchQuery, facilityFilter, areaFilter, dateFilter from deps since they're handled server-side
  }, [isAnyFilterActive, activeTab, reqStatusFilters, filteredColumns, totalPages, itemsPerPage, currentFieldMapping, sortBy, sortOrder, allEmployees]);

  // Ensure pagination resets to page 1 when server-side filters change
  // Using committedSearchQuery - only resets when search is actually triggered
  useEffect(() => {
    setCurrentPage(1);
  }, [committedSearchQuery, setCurrentPage]);
  
  // Also reset for client-side filters (reqStatusFilters)
  useEffect(() => {
    if (isAnyFilterActive) {
      setCurrentPage(1);
    }
  }, [reqStatusFilters, filteredColumns, isAnyFilterActive, setCurrentPage]);

  // Base list used for local filtering/rendering
  // Decide whether to use merged (single page) or normal paged data
  const baseEmployees = isAnyFilterActive ? mergedEmployees : currentEmployees;

  // Update filteredEmployees to use baseEmployees when available
  const finalFilteredEmployees = useMemo(() => {
    if (!isAnyFilterActive) {
      // With server-side latestCompletion, no client sorting needed
      return filteredEmployees;
    }
    
    // Re-apply filters to the merged employees
    let filtered = baseEmployees;
    
    // Apply search filter first (using committedSearchQuery - the one sent to server)
    if (committedSearchQuery) {
      const searchTerm = committedSearchQuery.toLowerCase();
      filtered = filtered.filter(emp => {
        const name = (emp.name || emp.Employee || '').toLowerCase();
        const employeeNumber = (emp.employeeNumber || emp.employeeId || '').toLowerCase();
        return name.includes(searchTerm) || employeeNumber.includes(searchTerm);
      });
    }
    
    // Apply date filter if active (covers scheduled, completed, awaiting, rejected)
    if (dateFilter.column && dateFilter.date) {
      const fieldKey = currentFieldMapping[dateFilter.column];
      if (fieldKey) {
        filtered = filtered.filter(emp => {
          let dateSource: string | Date | null | undefined = null;

          // For Awarded columns, use the awarded date field if present
          if (fieldKey === 'secureCareAwarded') {
            dateSource = (emp as any).secureCareAwardedDate;
          } else if (fieldKey === 'conferenceCompleted') {
            // Conference: use the conferenceCompleted date for completed/awaiting/rejected
            dateSource = emp[fieldKey];
          } else {
            // Regular training fields: prefer completed date; if not present, use scheduled date
            const completedDate = emp[fieldKey];
            const scheduleField = ScheduleFieldMapping[fieldKey];
            const scheduledDate = scheduleField ? emp[scheduleField] : null;
            dateSource = completedDate || scheduledDate;
          }

          if (!dateSource) return false;

          const empDate = parseDate(dateSource);
          const filterDate = dateFilter.date;
          if (!empDate || !filterDate) return false;

          // Compare dates (ignore time, timezone-safe)
          const empDateOnly = new Date(empDate.getFullYear(), empDate.getMonth(), empDate.getDate());
          const filterDateOnly = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());

          return empDateOnly.getTime() === filterDateOnly.getTime();
        });
      }
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
            // Show only records where notes are empty or NULL
            if (noteValue !== '' && emp.notes !== null && emp.notes !== undefined) return false;
          } else if (want === 'exclude-inactive') {
            // Show everything except Inactive
            if (noteValue === 'Inactive') return false;
          } else {
            if (noteValue !== want) return false;
          }
          continue;
        }

        // Custom filtering for Advisor
        if (column === 'Advisor') {
          const advisorId = emp.advisorId != null ? String(emp.advisorId) : '';
          if (want === 'unassigned') {
            // Show only records where advisor is NULL or empty
            if (emp.advisorId !== null && emp.advisorId !== undefined && advisorId !== '') return false;
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
    
    // For filtered views: rely on server-side sorting too

    // Default slicing for other sorts
    {
      const startIdx = (currentPage - 1) * itemsPerPage;
      const endIdx = startIdx + itemsPerPage;
      return filtered.slice(startIdx, endIdx);
    }
  }, [isAnyFilterActive, filteredEmployees, baseEmployees, committedSearchQuery, reqStatusFilters, filteredColumns, currentFieldMapping, dateFilter, currentPage, itemsPerPage, sortBy, currentEmployees, mergedEmployees, allEmployees]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (facilityFilter.length > 0) count++;
    if (areaFilter !== 'all') count++;
    if (committedSearchQuery) count++; // Count only committed/applied search
    if (dateFilter.column && dateFilter.date) count++;
    count += filteredColumns.reduce((acc, col) => {
      const fieldKey = currentFieldMapping[col];
      return acc + (fieldKey && ((reqStatusFilters[fieldKey] || 'all') !== 'all') ? 1 : 0);
    }, 0);
    return count;
  }, [facilityFilter, areaFilter, committedSearchQuery, dateFilter, reqStatusFilters, filteredColumns, currentFieldMapping]);

  const clearFilters = () => {
    setFacilityFilter([]);
    setAreaFilter('all');
    setSearchQuery('');
    setCommittedSearchQuery(''); // Also clear the committed search
    // Reset to level-specific default sorting
    const currentLevel: AwardType = getLevelFromTabKey(activeTab);
    setSortBy(currentLevel === 'Level 1' ? 'latest' : 'conference');
    setDateFilter({
      date: null,
      column: null
    });
    
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
    const baseClasses = variant === 'advisor' 
      ? "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-semibold shadow-sm min-w-[180px] h-8 transition-colors"
      : "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-full text-sm font-semibold shadow-sm min-w-[120px] h-8 transition-colors";
    
    
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
                e.preventDefault();
                e.stopPropagation();
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
          <div className="flex flex-col items-center gap-1 w-full">
            <StatusBadge
              variant="rejected"
              icon={AlertCircle}
              text="Rejected"
            />
            <div className="inline-flex items-center justify-center gap-1 bg-red-50 border border-red-200 rounded px-3 py-1 min-w-[120px] h-6">
              <span className="text-xs text-red-700 font-medium">
                {fmt.date(value)}
              </span>
            </div>
          </div>
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
      
      // In bulk mode, show prominent checkbox next to conference pending badge
      if (isBulkMode && !employee.awaiting) {
        const isSelected = selectedPendingItems.has(key);
        return (
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                togglePendingItemSelection(employee.employeeId, fieldKey);
              }}
              className={`flex items-center justify-center w-6 h-6 rounded-md border-2 transition-all duration-150 cursor-pointer ${
                isSelected 
                  ? 'bg-purple-600 border-purple-600 text-white shadow-lg ring-2 ring-purple-300' 
                  : 'bg-purple-50 border-purple-400 hover:border-purple-600 hover:bg-purple-100 ring-1 ring-purple-200'
              }`}
              title="Click to select for bulk scheduling"
            >
              {isSelected ? <Check className="w-4 h-4" /> : <Square className="w-3.5 h-3.5 text-purple-400" />}
            </motion.button>
            <StatusBadge
              variant="pending"
              icon={Clock}
              text="Pending"
              disabled={true}
            />
          </div>
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
      // Blue badge - both schedule and actual have dates
      // Clicking opens "Undo" popup: clears completed date and keeps scheduled date (yellow badge)
      // Only clickable if user has permission
      return (
        <StatusBadge
          variant="completed"
          icon={CheckCircle}
          text={fmt.date(value)}
          onMouseDown={canEditCompletedDate ? (e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsMouseDownInProgress(true);
            const rect = (e.target as HTMLElement).getBoundingClientRect();
            const position = { x: rect.left + rect.width / 2, y: rect.bottom + 8 };
            setPopupPosition(position);
            setCurrentPopupEmployee(employee);
            setCurrentPopupFieldKey(fieldKey);
            setOpenDatePicker(`edit-completed-${key}`);
            setTimeout(() => setIsMouseDownInProgress(false), 100);
          } : undefined}
          className={!canEditCompletedDate ? 'cursor-default' : 'cursor-pointer'}
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
              // Clear openDatePicker to ensure Mark Complete/Reschedule popup shows
              setOpenDatePicker(null);
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
         
    // In bulk mode, show prominent checkbox next to pending badge
    if (isBulkMode && !conferenceRejected && !employee.awaiting) {
      const isSelected = selectedPendingItems.has(key);
      return (
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              togglePendingItemSelection(employee.employeeId, fieldKey);
            }}
            className={`flex items-center justify-center w-6 h-6 rounded-md border-2 transition-all duration-150 cursor-pointer ${
              isSelected 
                ? 'bg-purple-600 border-purple-600 text-white shadow-lg ring-2 ring-purple-300' 
                : 'bg-purple-50 border-purple-400 hover:border-purple-600 hover:bg-purple-100 ring-1 ring-purple-200'
            }`}
            title="Click to select for bulk scheduling"
          >
            {isSelected ? <Check className="w-4 h-4" /> : <Square className="w-3.5 h-3.5 text-purple-400" />}
          </motion.button>
          <StatusBadge
            variant="pending"
            icon={Clock}
            text="Pending"
            disabled={true}
          />
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
   if (isLoading && !allEmployees.length) {
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
           <div className="px-3 sm:px-4 md:px-6 py-3 flex items-center justify-between gap-2 sm:gap-3">
             {/* Left side - Search Field and Bulk Schedule */}
             <div className="flex items-center gap-3">
               <div className="relative">
                 <ShineBorder
                   borderWidth={1}
                   duration={20}
                   shineColor={["#8b5cf6", "#a855f7", "#c084fc"]}
                   className="rounded-lg"
                 />
                 <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Search:</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="relative w-[200px]">
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        onFocus={(e) => e.currentTarget.select()}
                        placeholder="Employee name or ID"
                        className="h-8 text-sm pr-8 bg-white border-purple-200 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                      {searchQuery && (
                        <button
                          onClick={handleClearSearch}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <Button
                      onClick={handleSearch}
                      size="sm"
                      className="h-8 px-3 bg-purple-600 hover:bg-purple-700 text-white"
                      disabled={!searchQuery.trim()}
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                   <div className="flex items-center gap-2">
                     <div className="flex items-center gap-1">
                       <TrendingUp className="w-4 h-4 text-purple-600" />
                       <span className="text-sm font-medium text-purple-900">Sort:</span>
                     </div>
                    <Select value={sortBy} onValueChange={handleSortByChange}>
                       <SelectTrigger className="h-8 w-[180px] text-sm bg-white border-purple-200 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                        {currentLevel === 'Level 1' ? (
                           <>
                             <SelectItem value="latest">Latest Assigned</SelectItem>
                            <SelectItem value="latestCompletion">Latest Completion</SelectItem>
                             <SelectItem value="name">Name A-Z</SelectItem>
                             <SelectItem value="facility">Facility A-Z</SelectItem>
                           </>
                         ) : (
                           <>
                            <SelectItem value="conference">Latest Conference</SelectItem>
                            <SelectItem value="latestCompletion">Latest Completion</SelectItem>
                             <SelectItem value="name">Name A-Z</SelectItem>
                             <SelectItem value="facility">Facility A-Z</SelectItem>
                           </>
                         )}
                       </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              {/* Bulk Schedule Toggle Button - separate from filter box */}
              {currentLevel !== 'Level 1' && (
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    onClick={toggleBulkMode}
                    variant={isBulkMode ? "default" : "outline"}
                    size="sm"
                    className={`h-8 px-4 gap-2 font-medium transition-all duration-200 ${
                      isBulkMode 
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-md border-0' 
                        : 'bg-white border-purple-300 text-purple-700 hover:bg-purple-100 hover:border-purple-500 hover:text-purple-800 hover:shadow-sm'
                    }`}
                  >
                    <ListChecks className="w-4 h-4" />
                    {isBulkMode ? 'Exit Bulk Mode' : 'Bulk Schedule'}
                  </Button>
                </motion.div>
              )}
            </div>
            
            {/* Right side - Show Columns section */}
             <div className="flex flex-col items-end space-y-3">
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

               {/* Bottom row - Employee Count Indicator and Clear Filters */}
               <div className="flex items-center gap-3">
                 {/* Employee Count Indicator */}
                 <div className="flex items-center space-x-2">
                   <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-sm">
                     <Users className="h-4 w-4 text-white" />
                   </div>
                   <div className="flex flex-col">
                    {isAggregatingFiltered ? (
                       <div className="flex items-center space-x-2">
                         <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                         <span className="text-xs font-medium text-slate-600">Loading...</span>
                       </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        {(() => {
                          const totalCount = isAnyFilterActive ? aggregatedFilteredCount : totalEmployees;
                          const start = totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
                          const end = Math.min(currentPage * itemsPerPage, totalCount);
                          return (
                            <>
                              <span className="text-sm font-bold text-slate-800">
                                {start.toLocaleString()}–{end.toLocaleString()}
                              </span>
                              <span className="text-xs text-slate-500">of</span>
                              <span className="text-sm font-bold text-slate-800">
                                {totalCount.toLocaleString()}
                              </span>
                              <span className="text-xs text-slate-500">records</span>
                            </>
                          );
                        })()}
                        {isFetching && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75"></span>
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-500"></span>
                            </span>
                            Refreshing
                          </span>
                        )}
                      </div>
                    )}
                   </div>
                 </div>

                 {/* Clear filters button */}
                 {isAnyFilterActive && (
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
                 )}
               </div>
             </div>
          </div>

          {/* Bulk Action Bar - Sticky below header */}
          <AnimatePresence>
            {isBulkMode && activeTab !== 'level-1' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="sticky top-0 z-10 bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border-b border-purple-200 px-6 py-2.5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Instruction text when no items selected */}
                    {selectedPendingItems.size === 0 && (
                      <div className="flex items-center gap-2 text-purple-600">
                        <Square className="w-5 h-5" />
                        <span className="text-sm font-medium">Click the checkboxes next to "Pending" items to select them</span>
                      </div>
                    )}
                    {/* Selection count when items are selected */}
                    {selectedPendingItems.size > 0 && (
                      <>
                        <div className="flex items-center gap-2 bg-purple-100/80 px-3 py-1.5 rounded-full border border-purple-200">
                          <ListChecks className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-semibold text-purple-800">
                            {selectedPendingItems.size} selected
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPendingItems(new Set())}
                          className="h-7 px-2 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-100"
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          Clear
                        </Button>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      <span className="text-sm text-purple-700">Date:</span>
                      <DatePicker
                        date={bulkScheduleDate || undefined}
                        onDateChange={(date) => setBulkScheduleDate(date || null)}
                        placeholder="Select date"
                        className="w-[140px] h-8 text-sm bg-white border-purple-200 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                    <Button
                      onClick={bulkScheduleTraining}
                      disabled={selectedPendingItems.size === 0 || !bulkScheduleDate || isBulkScheduling}
                      size="sm"
                      className="h-8 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBulkScheduling ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Scheduling...</span>
                        </>
                      ) : (
                        <>
                          <CalendarPlus className="w-4 h-4" />
                          <span>Schedule {selectedPendingItems.size > 0 ? selectedPendingItems.size : ''}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                        column === 'Notes' ? "w-[10%]" : // Notes column - reduced width to compensate for advisor column
                        column.includes("Awarded") ? "w-[12%]" : "w-[10%]"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="whitespace-pre-line">{column}</span>
                        {index === 1 && ( // Facility column - Multi-select with filter icon
                          <MultiSelectCombobox
                            options={uniqueFacilities.map(f => ({ value: f, label: f }))}
                            selected={facilityFilter}
                            onChange={setFacilityFilter}
                            placeholder="All"
                            emptyText="No facilities found."
                            iconOnly={true}
                            dropdownWidth="320px"
                          />
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
                            setFacilityFilter([]);
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
                          <div className="flex items-center gap-1">
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
                                      <DropdownMenuRadioItem value="exclude-inactive">Exclude Inactive</DropdownMenuRadioItem>
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
                            
                            {/* Date Filter Button - show for completion date columns and Conference Completed */}
                            {(!column.includes("Awarded") || column.includes("Conference")) && !column.includes("Notes") && !column.includes("Advisor") && (
                              <DropdownMenu open={openDateFilterColumn === column} onOpenChange={(v) => setOpenDateFilterColumn(v ? column : null)}>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className={`h-6 px-1 mt-1 flex-shrink-0 ${
                                      dateFilter.column === column ? 'bg-blue-100 text-blue-600' : ''
                                    }`}
                                  >
                                    <Calendar className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-64 p-4">
                                  <DropdownMenuLabel>Filter by Completion Date</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  <div className="space-y-3">
                                    <div className="space-y-2">
                                      <Label className="text-sm font-medium">Select Date</Label>
                                      <DatePicker
                                        date={dateFilter.column === column ? dateFilter.date : null}
                                        onDateChange={(date) => {
                                          setDateFilter({
                                            date: date,
                                            column: column
                                          });
                                          // Close the dropdown when a date is picked
                                          setOpenDateFilterColumn(null);
                                        }}
                                        placeholder="Select date"
                                      />
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setDateFilter({
                                            date: null,
                                            column: null
                                          });
                                          setOpenDateFilterColumn(null);
                                        }}
                                        className="flex-1"
                                      >
                                        Clear
                                      </Button>
                                    </div>
                                  </div>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
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
                          {finalFilteredEmployees.map((employee, index) => (
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
                                     <TableCell key={colIndex} className="py-2 px-4 w-[10%] text-center">
                                       <div className="flex justify-center">
                                         <div className="dropdown-container" data-dropdown>
                                           <StatusBadge
                                             variant="notes"
                                             icon={MessageSquare}
                                             text={selectedNoteOption?.label || 'Add Notes'}
                                             onClick={(e) => {
                                               e.preventDefault();
                                               e.stopPropagation();
                                               const rect = (e.target as HTMLElement).getBoundingClientRect();
                                               const position = {
                                                 x: rect.left + rect.width / 2,
                                                 y: rect.bottom + 4 // margin-top: 4px from original CSS
                                               };
                                               setNotesDropdownPosition(position);
                                               setNotesDropdownOpen(isNotesDropdownOpen ? null : employee.employeeId.toString());
                                             }}
                                           />
                                           
                                         </div>
                                       </div>
                                     </TableCell>
                                   );
                                } else if (column === 'Advisor') { // Enhanced Advisor column with badge UI and floating dropdown
                                   const currentAdvisor = advisors.find(a => a.advisorId === employee.advisorId);
                                   const isAdvisorDropdownOpen = advisorDropdownOpen === employee.employeeId.toString();
                                   
                                   return (
                                     <TableCell key={colIndex} className="py-2 px-4 w-[12%] text-center">
                                       <div className="flex justify-center">
                                         <div className="dropdown-container" data-dropdown>
                                           <StatusBadge
                                             variant="advisor"
                                             icon={UserCheck}
                                             text={employee.advisorName || currentAdvisor?.fullName || 'Add advisor'}
                                             onClick={(e) => {
                                               e.preventDefault();
                                               e.stopPropagation();
                                               const rect = (e.target as HTMLElement).getBoundingClientRect();
                                               const dropdownHeight = Math.min(400, (advisors.length + 1) * 60 + 60); // Estimate: header + items + padding
                                               const spaceBelow = window.innerHeight - rect.bottom;
                                               const spaceAbove = rect.top;
                                               const shouldShowAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
                                               
                                               const position = {
                                                 x: rect.left + rect.width / 2,
                                                 y: shouldShowAbove 
                                                   ? rect.top - 4 // Position above with 4px margin
                                                   : rect.bottom + 4, // Position below with 4px margin
                                                 positionAbove: shouldShowAbove
                                               };
                                               setAdvisorDropdownPosition(position);
                                               setAdvisorDropdownOpen(isAdvisorDropdownOpen ? null : employee.employeeId.toString());
                                             }}
                                           />
                                           
                                         </div>
                                       </div>
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
                          {(() => {
                            const totalCount = isAnyFilterActive ? aggregatedFilteredCount : totalEmployees;
                            const start = totalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
                            const end = Math.min(currentPage * itemsPerPage, totalCount);
                            const totalPagesDisplay = isAnyFilterActive ? Math.max(1, Math.ceil(totalCount / itemsPerPage)) : totalPages;
                            return (
                              <span>
                                Page {currentPage} of {totalPagesDisplay} · Showing {start.toLocaleString()}–{end.toLocaleString()} of {totalCount.toLocaleString()}
                               {isAggregatingFiltered && <span className="ml-2 text-purple-600">• Loading…</span>}
                              </span>
                            );
                          })()}
                        </div>
                      {(() => {
                        if (!isAnyFilterActive) return totalPages > 1;
                        // For filtered views: compute total filtered pages from aggregatedFilteredCount
                        const filteredPages = Math.max(1, Math.ceil(aggregatedFilteredCount / itemsPerPage));
                        return filteredPages > 1;
                      })() && (
                         <CompactPagination
                           currentPage={currentPage}
                           totalPages={isAnyFilterActive ? Math.max(1, Math.ceil(aggregatedFilteredCount / itemsPerPage)) : totalPages}
                           onPageChange={setCurrentPage}
                           totalItems={isAnyFilterActive ? aggregatedFilteredCount : totalEmployees}
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
       {(() => {
         const shouldShow = openDatePicker && popupPosition && currentPopupEmployee && openDatePicker.includes('conferenceCompleted');
         return shouldShow;
       })() && (
         <div 
           className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-xl p-3 date-picker-popup modal-container"
           data-conference-popup
           style={{
             left: Math.max(10, Math.min(popupPosition.x, window.innerWidth - 200)), // Keep within viewport
             top: Math.min(popupPosition.y, window.innerHeight - 150), // Keep within viewport
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
         </div>
       )}
       
       {/* Portal popup for Mark Complete/Reschedule */}
       {popupPosition && currentPopupEmployee && currentPopupFieldKey && 
        (!openDatePicker || (!openDatePicker.includes('conferenceCompleted') && !openDatePicker.startsWith('reschedule-') && !openDatePicker.startsWith('edit-completed-'))) &&
        ScheduleFieldMapping[currentPopupFieldKey] && 
        currentPopupEmployee[ScheduleFieldMapping[currentPopupFieldKey]] && (
         <div 
           className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-xl p-3 date-picker-popup modal-container"
           data-complete-reschedule-popup
           style={{
             left: Math.max(10, Math.min(popupPosition.x, window.innerWidth - 200)), // Keep within viewport
             top: Math.min(popupPosition.y, window.innerHeight - 120), // Keep within viewport - ensure "Reschedule" is visible
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
         </div>
       )}
       
       {/* Portal popup for Undo Completed Date - Only show if user has permission */}
       {canEditCompletedDate && openDatePicker && popupPosition && currentPopupEmployee && currentPopupFieldKey && 
        openDatePicker.startsWith('edit-completed-') && (
         <div 
           className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-xl p-3 date-picker-popup modal-container"
           data-edit-completed-popup
           style={{
             left: Math.max(10, Math.min(popupPosition.x, window.innerWidth - 200)),
             top: Math.min(popupPosition.y, window.innerHeight - 120),
             transform: 'translateX(-50%)'
           }}
         >
          <div className="flex flex-col gap-2">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const employeeId = currentPopupEmployee?.employeeId;
                const requirementKey = currentPopupFieldKey;
                const scheduleFieldKey = ScheduleFieldMapping[requirementKey];
                const scheduledDate = scheduleFieldKey ? currentPopupEmployee[scheduleFieldKey] : null;
                
                setOpenDatePicker(null);
                setPopupPosition(null);
                setCurrentPopupEmployee(null);
                setCurrentPopupFieldKey(null);
                
                if (employeeId && requirementKey && scheduledDate) {
                  // Use the existing scheduled date to keep it unchanged
                  editCompletedDate({ 
                    employeeId, 
                    requirementKey, 
                    date: parseDate(scheduledDate) || new Date() 
                  });
                }
              }}
              disabled={isEditingCompleted}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:from-orange-600 hover:to-red-600 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              {isEditingCompleted ? 'Undoing...' : 'Undo'}
            </button>
          </div>
         </div>
       )}
       
       {/* Portal popup for Reschedule Date Picker */}
       {openDatePicker && popupPosition && currentPopupEmployee && currentPopupFieldKey && 
        openDatePicker.startsWith('reschedule-') && (
         <div 
           className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-xl p-3 date-picker-popup"
           data-reschedule-popup
           style={{
             left: Math.max(10, Math.min(popupPosition.x, window.innerWidth - 200)), // Keep within viewport
             top: Math.min(popupPosition.y, window.innerHeight - 300), // Keep within viewport - ensure calendar is visible
             transform: 'translateX(-50%)'
           }}
         >
          <InlineCalendar
            selected={parseDate(currentPopupEmployee[ScheduleFieldMapping[currentPopupFieldKey]]) || undefined}
            onSelect={(date) => {
              if (date) {
                const employeeId = currentPopupEmployee?.employeeId;
                const requirementKey = currentPopupFieldKey;
                setOpenDatePicker(null);
                setPopupPosition(null);
                setCurrentPopupEmployee(null);
                setCurrentPopupFieldKey(null);
                if (employeeId && requirementKey) {
                  rescheduleTraining({ employeeId, requirementKey, date });
                }
              }
            }}
          />
         </div>
       )}
       
       {/* Portal popup for Schedule Date Picker */}
       {(() => {
         // Simplified render condition - just check if we have the basic requirements
         const shouldRender = openDatePicker && 
           popupPosition && 
           currentPopupEmployee && 
           currentPopupFieldKey && 
           !openDatePicker.includes('conferenceCompleted') && 
           !openDatePicker.startsWith('reschedule-') &&
           !openDatePicker.startsWith('edit-completed-');
         
         
         return shouldRender;
       })() && (
         <div 
           className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-xl p-3 date-picker-popup"
           data-schedule-popup
           style={{
             left: Math.max(10, Math.min(popupPosition.x, window.innerWidth - 200)), // Keep within viewport
             top: Math.min(popupPosition.y, window.innerHeight - 300), // Keep within viewport - ensure calendar is visible
             transform: 'translateX(-50%)'
           }}
         >
          <InlineCalendar
            selected={undefined}
            onSelect={(date) => {
              if (date) {
                const employeeId = currentPopupEmployee?.employeeId;
                const requirementKey = currentPopupFieldKey;
                setOpenDatePicker(null);
                setPopupPosition(null);
                setCurrentPopupEmployee(null);
                setCurrentPopupFieldKey(null);
                if (employeeId && requirementKey) {
                  scheduleTraining({ employeeId, requirementKey, date });
                } else {
                  console.error('Missing data for scheduling:', { employeeId, requirementKey, date });
                }
              }
            }}
          />
         </div>
       )}
       
       {/* Fixed positioned Notes dropdown */}
       {notesDropdownOpen && notesDropdownPosition && (
         <div 
           className="fixed z-[9999] bg-white border border-gray-300 rounded-lg shadow-xl dropdown-menu min-w-[180px] max-h-[250px]"
           data-notes-dropdown
           style={{
             left: notesDropdownPosition.x,
             top: Math.min(notesDropdownPosition.y, window.innerHeight - 300), // Prevent going off bottom of viewport
             transform: 'translateX(-50%)'
           }}
         >
           {NOTES_OPTIONS.map((option) => (
             <div
               key={option.value}
               className="px-3 py-2 text-sm cursor-pointer hover:bg-cyan-50 rounded transition-colors"
               onClick={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 const employeeId = notesDropdownOpen;
                 handleSaveNotes(employeeId, option.value);
                 setNotesDropdownOpen(null);
                 setNotesDropdownPosition(null);
               }}
             >
               {option.label}
             </div>
           ))}
         </div>
       )}
       
       {/* Fixed positioned Advisor dropdown */}
       {advisorDropdownOpen && advisorDropdownPosition && (() => {
         const estimatedHeight = Math.min(400, (advisors.length + 1) * 60 + 60);
         const spaceBelow = window.innerHeight - advisorDropdownPosition.y;
         const spaceAbove = advisorDropdownPosition.y;
         const useBottomPosition = advisorDropdownPosition.positionAbove || spaceBelow < estimatedHeight;
         
         return (
           <div 
             className="fixed z-[9999] bg-white border border-purple-200 rounded-xl shadow-2xl dropdown-menu advisor-dropdown min-w-[240px] max-w-[280px] overflow-hidden"
             data-advisor-dropdown
             style={{
               left: advisorDropdownPosition.x,
               ...(useBottomPosition 
                 ? {
                     bottom: Math.max(20, window.innerHeight - advisorDropdownPosition.y + 4),
                     maxHeight: `${Math.min(spaceAbove - 20, 400)}px`
                   }
                 : {
                     top: Math.min(advisorDropdownPosition.y, window.innerHeight - estimatedHeight - 20),
                     maxHeight: `${Math.min(spaceBelow - 20, 400)}px`
                   }
               ),
               transform: 'translateX(-50%)',
               overflowY: 'auto'
             }}
           >
           {/* Header */}
           <div className="bg-gradient-to-r from-purple-50 to-purple-100 border-b border-purple-200 px-4 py-2.5">
             <div className="flex items-center gap-2">
               <UserCheck className="w-4 h-4 text-purple-600" />
               <span className="text-sm font-semibold text-purple-900">Select Advisor</span>
             </div>
           </div>
           
           {/* Options */}
           <div className="py-1">
             <div
               className="flex items-center gap-3 cursor-pointer hover:bg-purple-50 transition-all duration-150 px-4 py-2.5 group border-b border-gray-100"
               onClick={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 const employeeId = advisorDropdownOpen;
                 handleSaveAdvisor(employeeId, 'none');
                 setAdvisorDropdownOpen(null);
                 setAdvisorDropdownPosition(null);
               }}
             >
               <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                 <X className="w-4 h-4 text-gray-500" />
               </div>
               <div className="flex-1 min-w-0">
                 <div className="text-sm font-medium text-gray-700 group-hover:text-purple-700 transition-colors">
                   No advisor assigned
                 </div>
                 <div className="text-xs text-gray-500 mt-0.5">Clear assignment</div>
               </div>
             </div>
             
             {advisors.map((advisor) => {
               const initials = advisor.fullName
                 .split(' ')
                 .map(n => n[0])
                 .join('')
                 .toUpperCase()
                 .slice(0, 2);
               
               return (
                 <div
                   key={advisor.advisorId}
                   className="flex items-center gap-3 cursor-pointer hover:bg-purple-50 transition-all duration-150 px-4 py-2.5 group"
                   onClick={(e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     const employeeId = advisorDropdownOpen;
                     handleSaveAdvisor(employeeId, advisor.advisorId.toString());
                     setAdvisorDropdownOpen(null);
                     setAdvisorDropdownPosition(null);
                   }}
                 >
                   <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                     <span className="text-xs font-semibold text-white">{initials}</span>
                   </div>
                   <div className="flex-1 min-w-0">
                     <div className="text-sm font-medium text-gray-900 group-hover:text-purple-700 transition-colors truncate">
                       {advisor.fullName}
                     </div>
                   </div>
                   <UserCheck className="w-4 h-4 text-transparent group-hover:text-purple-500 transition-colors flex-shrink-0" />
                 </div>
               );
             })}
           </div>
         </div>
         );
       })()}
     </TooltipProvider>
   );
 }

