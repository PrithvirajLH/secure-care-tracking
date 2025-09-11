import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CheckCircle, Clock, Award, Star, Trophy, Medal, Crown, Eye, ChevronUp, ChevronDown, Users2, AlertCircle } from "lucide-react";
import EmployeeDetailModal from "@/components/EmployeeDetailModal";
import { CompactPagination } from "@/components/ui/compact-pagination";
import { useEmployees } from "@/hooks/useEmployees";
import PageHeader from "@/components/PageHeader";
import EmployeeFilters from "@/components/EmployeeFilters";
import { trainingAPI } from "@/services/api";
import { useQuery } from '@tanstack/react-query';

export default function Employees() {
  const { state, dispatch } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedFacility, setSelectedFacility] = useState<string>("all");
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  // Pagination is now handled by the useEmployees hook
  const [itemsPerPage] = useState<number>(10); // Changed from 100 to test pagination
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>("all");

  // Fetch filter options from API
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: () => trainingAPI.getFilterOptions(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Use the same data source as Training page for consistency
  const filters = useMemo(() => ({
    facility: selectedFacility !== "all" ? selectedFacility : undefined,
    area: selectedArea !== "all" ? selectedArea : undefined,
    status: selectedStatus !== "all" ? selectedStatus : undefined,
    search: state.filters.query || undefined
  }), [selectedFacility, selectedArea, selectedStatus, state.filters.query]);

  // Create a stable filter object for the API call
  const stableFilters = useMemo(() => {
    const filterObj: any = {};
    if (selectedFacility !== "all") filterObj.facility = selectedFacility;
    if (selectedArea !== "all") filterObj.area = selectedArea;
    if (selectedStatus !== "all") filterObj.status = selectedStatus;
    if (selectedJobTitle !== "all") filterObj.jobTitle = selectedJobTitle;
    if (state.filters.query) filterObj.search = state.filters.query;
    return filterObj;
  }, [selectedFacility, selectedArea, selectedStatus, selectedJobTitle, state.filters.query]);

  const {
    employees: currentEmployees,
    isLoading,
    error,
    currentPage: apiCurrentPage,
    setCurrentPage: setApiCurrentPage,
    totalPages,
    totalEmployees,
    isFetching
  } = useEmployees({ ...stableFilters, level: 'all' }, itemsPerPage);

  // Sync local state with API state
  useEffect(() => {
    if (currentEmployees && currentEmployees.length > 0) {
      dispatch({ type: "setEmployees", payload: currentEmployees });
    }
  }, [currentEmployees, dispatch]);

  // Pagination is handled by the useEmployees hook

  // Debug logging for pagination and filters
  useEffect(() => {
    // Page tracking removed
  }, [apiCurrentPage, totalPages, totalEmployees]);

  useEffect(() => {
    // Filter tracking removed
  }, [stableFilters]);

  useEffect(() => {
    // Sort tracking removed
  }, [sortField, sortDirection]);

  // Load initial state from URL
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const fac = searchParams.get("facility") ?? "all";
    const ar = searchParams.get("area") ?? "all";
    const st = searchParams.get("status") ?? "all";
    const jt = searchParams.get("jobTitle") ?? "all";
    const sf = searchParams.get("sort") ?? "name";
    const sd = (searchParams.get("dir") as "asc" | "desc") ?? "asc";
    const pg = Number(searchParams.get("page") ?? 1);
    if (q) dispatch({ type: "setQuery", payload: q });
    setSelectedFacility(fac);
    setSelectedArea(ar);
    setSelectedStatus(st);
    setSelectedJobTitle(jt);
    setSortField(sf);
    setSortDirection(sd);
    const pageNumber = Number.isFinite(pg) && pg > 0 ? pg : 1;
    setApiCurrentPage(pageNumber);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to URL when key states change
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set("q", state.filters.query ?? "");
    params.set("facility", selectedFacility);
    params.set("area", selectedArea);
    params.set("status", selectedStatus);
    params.set("jobTitle", selectedJobTitle);
    params.set("sort", sortField);
    params.set("dir", sortDirection);
    params.set("page", String(apiCurrentPage));
    setSearchParams(params, { replace: true });
  }, [state.filters.query, selectedFacility, selectedArea, selectedStatus, selectedJobTitle, sortField, sortDirection, apiCurrentPage]);

  // Use currentEmployees from API instead of state.employees for consistency
  const employees = currentEmployees || [];

  // Apply sorting to the API data
  const sortedEmployees = useMemo(() => {
    if (!currentEmployees || currentEmployees.length === 0) return [];
    
    let filtered = [...currentEmployees];
    
    // Apply status filter
    if (selectedStatus !== "all") {
      filtered = filtered.filter(employee => {
        switch (selectedStatus) {
          case "Awaiting Approval":
            return employee.awaiting === true; // awaiting = 1 means waiting for approval
          case "Conference Rejected":
            return employee.awaiting === null;
          case "Not Started":
            return !employee.awardType && !employee.assignedDate;
          case "Level 1 In Progress":
            return employee.awardType === "Level 1" && employee.assignedDate && !employee.secureCareAwarded;
          case "Level 1":
            return employee.awardType === "Level 1" && employee.secureCareAwarded === true;
          case "Level 2 In Progress":
            return employee.awardType === "Level 2" && !employee.secureCareAwarded && employee.awaiting !== 1 && employee.awaiting !== true;
          case "Level 2":
            return employee.awardType === "Level 2" && employee.secureCareAwarded === true;
          case "Level 3 In Progress":
            return employee.awardType === "Level 3" && !employee.secureCareAwarded && employee.awaiting !== 1 && employee.awaiting !== true;
          case "Level 3":
            return employee.awardType === "Level 3" && employee.secureCareAwarded === true;
          case "Consultant In Progress":
            return employee.awardType === "Consultant" && !employee.secureCareAwarded && employee.awaiting !== 1 && employee.awaiting !== true;
          case "Consultant":
            return employee.awardType === "Consultant" && employee.secureCareAwarded === true;
          case "Coach In Progress":
            return employee.awardType === "Coach" && !employee.secureCareAwarded && employee.awaiting !== 1 && employee.awaiting !== true;
          case "Coach":
            return employee.awardType === "Coach" && employee.secureCareAwarded === true;
          default:
            return true;
        }
      });
    }
    
    // Apply sorting
    const sorted = filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "name":
          aValue = (a.name || a.Employee || '').toLowerCase();
          bValue = (b.name || b.Employee || '').toLowerCase();
          break;
        case "employeeId":
          aValue = String(a.employeeNumber || a.employeeId || a.Employee || '').toLowerCase();
          bValue = String(b.employeeNumber || b.employeeId || b.Employee || '').toLowerCase();
          break;
        case "facility":
          aValue = (a.facility || a.Facility || '').toLowerCase();
          bValue = (b.facility || b.Facility || '').toLowerCase();
          break;
        case "area":
          aValue = (a.area || a.Area || '').toLowerCase();
          bValue = (b.area || b.Area || '').toLowerCase();
          break;
        case "jobTitle":
          aValue = (a.staffRoll || a.staffRoles || '').toLowerCase();
          bValue = (b.staffRoll || b.staffRoles || '').toLowerCase();
          break;
        default:
          aValue = (a.name || a.Employee || '').toLowerCase();
          bValue = (b.name || b.Employee || '').toLowerCase();
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [currentEmployees, sortField, sortDirection, selectedStatus]);

    const getCurrentLevel = (employee: any) => {
    // The backend now returns the highest level record for each employee
    // We simply check if that highest level is awarded or in progress
    
    // Debug logging for Sophie Allen removed
    
    // Handle both boolean and string values for secureCareAwarded
    const isAwarded = employee.secureCareAwarded === true || employee.secureCareAwarded === 1 || employee.secureCareAwarded === '1';
    
    // Determine status based on award type, completion status, and awaiting status
    switch (employee.awardType) {
      case 'Coach':
        if (isAwarded) {
          return { 
            level: "Coach", 
            variant: "outline", 
            icon: Crown,
            iconColor: "text-yellow-500",
            bgColor: "bg-gradient-to-r from-yellow-50 to-amber-50",
            borderColor: "border-yellow-200",
            textColor: "text-yellow-700",
            className: "shadow-sm hover:shadow-md transition-all duration-200"
          };
        } else if (employee.awaiting === 1 || employee.awaiting === true) {
          return { 
            level: "Awaiting Approval", 
            variant: "outline", 
            icon: Clock,
            iconColor: "text-amber-600",
            bgColor: "bg-gradient-to-r from-amber-50 to-orange-50",
            borderColor: "border-amber-200",
            textColor: "text-amber-700",
            className: "shadow-sm hover:shadow-md transition-all duration-200"
          };
        } else if (employee.awaiting === null) {
          return { 
            level: "Conference Rejected", 
            variant: "outline", 
            icon: AlertCircle,
            iconColor: "text-red-600",
            bgColor: "bg-gradient-to-r from-red-50 to-pink-50",
            borderColor: "border-red-200",
            textColor: "text-red-700",
            className: "shadow-sm hover:shadow-md transition-all duration-200"
          };
        } else {
          return { 
            level: "Coach In Progress", 
            variant: "outline", 
            icon: Crown,
            iconColor: "text-yellow-600",
            bgColor: "bg-gradient-to-r from-yellow-50 to-amber-50",
            borderColor: "border-yellow-200",
            textColor: "text-yellow-700",
            className: "shadow-sm hover:shadow-md transition-all duration-200"
          };
        }
        
      case 'Consultant':
        if (isAwarded) {
          return { 
            level: "Consultant", 
            variant: "outline", 
            icon: Trophy,
            iconColor: "text-purple-500",
            bgColor: "bg-gradient-to-r from-purple-50 to-indigo-50",
            borderColor: "border-purple-200",
            textColor: "text-purple-700",
            className: "shadow-sm hover:shadow-md transition-all duration-200"
          };
        } else if (employee.awaiting === 1 || employee.awaiting === true) {
          return { 
            level: "Awaiting Approval", 
            variant: "outline", 
            icon: Clock,
            iconColor: "text-amber-600",
            bgColor: "bg-gradient-to-r from-amber-50 to-orange-50",
            borderColor: "border-amber-200",
            textColor: "text-amber-700",
            className: "shadow-sm hover:shadow-md transition-all duration-200"
          };
        } else if (employee.awaiting === null) {
          return { 
            level: "Conference Rejected", 
            variant: "outline", 
            icon: AlertCircle,
            iconColor: "text-red-600",
            bgColor: "bg-gradient-to-r from-red-50 to-pink-50",
            borderColor: "border-red-200",
            textColor: "text-red-700",
            className: "shadow-sm hover:shadow-md transition-all duration-200"
          };
        } else {
          return { 
            level: "Consultant In Progress", 
            variant: "outline", 
            icon: Trophy,
            iconColor: "text-purple-600",
            bgColor: "bg-gradient-to-r from-purple-50 to-indigo-50",
            borderColor: "border-purple-200",
            textColor: "text-purple-700",
            className: "shadow-sm hover:shadow-md transition-all duration-200"
          };
        }
        
      case 'Level 3':
        if (isAwarded) {
          return { 
            level: "Level 3", 
            variant: "outline", 
            icon: Medal,
            iconColor: "text-blue-500",
            bgColor: "bg-gradient-to-r from-blue-50 to-cyan-50",
            borderColor: "border-blue-200",
            textColor: "text-blue-700",
            className: "shadow-sm hover:shadow-md transition-all duration-200"
          };
        } else if (employee.awaiting === 1 || employee.awaiting === true) {
          return { 
            level: "Awaiting Approval", 
            variant: "outline", 
            icon: Clock,
            iconColor: "text-amber-600",
            bgColor: "bg-gradient-to-r from-amber-50 to-orange-50",
            borderColor: "border-amber-200",
            textColor: "text-amber-700",
            className: "shadow-sm hover:shadow-md transition-all duration-200"
          };
        } else if (employee.awaiting === null) {
          return { 
            level: "Conference Rejected", 
            variant: "outline", 
            icon: AlertCircle,
            iconColor: "text-red-600",
            bgColor: "bg-gradient-to-r from-red-50 to-pink-50",
            borderColor: "border-red-200",
            textColor: "text-red-700",
            className: "shadow-sm hover:shadow-md transition-all duration-200"
          };
        } else {
          return { 
            level: "Level 3 In Progress", 
            variant: "outline", 
            icon: Medal,
            iconColor: "text-blue-600",
            bgColor: "bg-gradient-to-r from-blue-50 to-cyan-50",
            borderColor: "border-blue-200",
            textColor: "text-blue-700",
            className: "shadow-sm hover:shadow-md transition-all duration-200"
          };
        }
        
      case 'Level 2':
        if (isAwarded) {
          return { 
            level: "Level 2", 
            variant: "outline", 
            icon: Star,
            iconColor: "text-orange-500",
            bgColor: "bg-gradient-to-r from-orange-50 to-red-50",
            borderColor: "border-orange-200",
            textColor: "text-orange-700",
            className: "shadow-sm hover:shadow-md transition-all duration-200"
          };
        } else if (employee.awaiting === 1 || employee.awaiting === true) {
          return { 
            level: "Awaiting Approval", 
            variant: "outline", 
            icon: Clock,
            iconColor: "text-amber-600",
            bgColor: "bg-gradient-to-r from-amber-50 to-orange-50",
            borderColor: "border-amber-200",
            textColor: "text-amber-700",
            className: "shadow-sm hover:shadow-md transition-all duration-200"
          };
        } else if (employee.awaiting === null) {
          return { 
            level: "Conference Rejected", 
            variant: "outline", 
            icon: AlertCircle,
            iconColor: "text-red-600",
            bgColor: "bg-gradient-to-r from-red-50 to-pink-50",
            borderColor: "border-red-200",
            textColor: "text-red-700",
            className: "shadow-sm hover:shadow-md transition-all duration-200"
          };
        } else {
          return { 
            level: "Level 2 In Progress", 
            variant: "outline", 
            icon: Star,
            iconColor: "text-orange-600",
            bgColor: "bg-gradient-to-r from-orange-50 to-red-50",
            borderColor: "border-orange-200",
            textColor: "text-orange-700",
            className: "shadow-sm hover:shadow-md transition-all duration-200"
          };
        }
        
      case 'Level 1':
        if (isAwarded) {
          return { 
            level: "Level 1", 
            variant: "outline", 
            icon: Award,
            iconColor: "text-green-500",
            bgColor: "bg-gradient-to-r from-green-50 to-emerald-50",
            borderColor: "border-green-200",
            textColor: "text-green-700",
            className: "shadow-sm hover:shadow-md transition-all duration-200"
          };
        } else if (employee.awaiting === 1 || employee.awaiting === true) {
          return { 
            level: "Awaiting Approval", 
            variant: "outline", 
            icon: Clock,
            iconColor: "text-amber-600",
            bgColor: "bg-gradient-to-r from-amber-50 to-orange-50",
            borderColor: "border-amber-200",
            textColor: "text-amber-700",
            className: "shadow-sm hover:shadow-md transition-all duration-200"
          };
        } else if (employee.awaiting === null) {
          return { 
            level: "Conference Rejected", 
            variant: "outline", 
            icon: AlertCircle,
            iconColor: "text-red-600",
            bgColor: "bg-gradient-to-r from-red-50 to-pink-50",
            borderColor: "border-red-200",
            textColor: "text-red-700",
            className: "shadow-sm hover:shadow-md transition-all duration-200"
          };
        } else {
          return { 
            level: "Level 1 In Progress", 
            variant: "outline", 
            icon: Award,
            iconColor: "text-green-600",
            bgColor: "bg-gradient-to-r from-green-50 to-emerald-50",
            borderColor: "border-green-200",
            textColor: "text-green-700",
            className: "shadow-sm hover:shadow-md transition-all duration-200"
          };
        }
    }
    
    // Debug logging for fallback case
    // Debug logging for Sophia Allen removed
    
    // Fallback for employees with no training data
    return { 
      level: "Not Started", 
      variant: "outline", 
      icon: Clock,
      iconColor: "text-gray-400",
      bgColor: "bg-gradient-to-r from-gray-50 to-slate-50",
      borderColor: "border-gray-200",
      textColor: "text-gray-600",
      className: "shadow-sm hover:shadow-md transition-all duration-200"
    };
  };

  // Reset to first page when filters or sorting change
  useEffect(() => {
    setApiCurrentPage(1);
  }, [state.filters.query, selectedFacility, selectedArea, selectedStatus, selectedJobTitle, sortField, sortDirection]);

  // Get filter options from API or use fallback
  const facilities = useMemo(() => {
    return filterOptions?.facilities?.sort() || [];
  }, [filterOptions]);

  const areas = useMemo(() => {
    if (!filterOptions?.areas) return [];
    return filterOptions.areas.sort((a, b) => {
      // Extract numeric part and sort numerically
      const aNum = parseInt(a.replace(/\D/g, '')) || 0;
      const bNum = parseInt(b.replace(/\D/g, '')) || 0;
      return aNum - bNum;
    });
  }, [filterOptions]);

  const jobTitles = useMemo(() => {
    return filterOptions?.jobTitles?.sort() || [];
  }, [filterOptions]);

  // Get unique statuses for filter options
  const statuses = useMemo(() => [
    'Not Started', 'Level 1 In Progress', 'Level 1', 'Level 2 In Progress', 'Level 2', 
    'Level 3 In Progress', 'Level 3', 'Consultant In Progress', 'Consultant', 'Coach In Progress', 'Coach',
    'Awaiting Approval', 'Conference Rejected'
  ].sort(), []);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return (
        <div className="flex flex-col -space-y-1">
          <ChevronUp className="w-3 h-3 text-gray-300" />
          <ChevronDown className="w-3 h-3 text-gray-300" />
        </div>
      );
    }
    return sortDirection === "asc" ? 
      <ChevronUp className="w-4 h-4 text-purple-600" /> : 
      <ChevronDown className="w-4 h-4 text-purple-600" />;
  };

  const getSortButtonClass = (field: string) => {
    const isActive = sortField === field;
    return `h-auto p-0 font-semibold hover:text-purple-900 hover:bg-transparent transition-all duration-200 ${
      isActive 
        ? 'text-purple-700 bg-purple-50 px-2 py-1 rounded-md' 
        : 'text-gray-700 hover:text-purple-900'
    }`;
  };



  return (
    <div>
      {/* Combined Header and Filters */}
      <div className="space-y-4">
        {/* Header */}
        <PageHeader
          icon={Users2}
          title="Employee Directory"
          description="Manage your employee roster and view basic training status"
        />

        <EmployeeFilters
          query={state.filters.query || ""}
          onQueryChange={(value) => dispatch({ type: "setQuery", payload: value })}
          selectedFacility={selectedFacility}
          onFacilityChange={setSelectedFacility}
          selectedArea={selectedArea}
          onAreaChange={setSelectedArea}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedJobTitle={selectedJobTitle}
          onJobTitleChange={setSelectedJobTitle}
          onClearFilters={() => {
            setSelectedFacility("all");
            setSelectedArea("all");
            setSelectedStatus("all");
            setSelectedJobTitle("all");
            dispatch({ type: "setQuery", payload: "" });
            setApiCurrentPage(1);
          }}
          facilities={facilities}
          areas={areas}
          statuses={statuses}
          jobTitles={jobTitles}
        />
      </div>

      <div className="rounded-lg border bg-white/95 backdrop-blur-sm shadow-lg border-gray-200 overflow-auto">
        <Table>
                     <TableHeader className="sticky top-0 z-10">
             <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
               <TableHead className="w-[20%] font-semibold text-gray-700 text-base">
                 <Button
                   variant="ghost"
                   className={getSortButtonClass("name")}
                   onClick={() => handleSort("name")}
                 >
                   <div className="flex items-center gap-2">
                     <span>Employee Details</span>
                     {getSortIcon("name")}
                   </div>
                 </Button>
               </TableHead>
               <TableHead className="w-[12%] font-semibold text-gray-700 text-base">
                 <Button
                   variant="ghost"
                   className={getSortButtonClass("employeeId")}
                   onClick={() => handleSort("employeeId")}
                 >
                   <div className="flex items-center gap-2">
                     <span>Employee ID</span>
                     {getSortIcon("employeeId")}
                   </div>
                 </Button>
               </TableHead>
               <TableHead className="w-[15%] font-semibold text-gray-700 text-base">
                 <Button
                   variant="ghost"
                   className={getSortButtonClass("facility")}
                   onClick={() => handleSort("facility")}
                 >
                   <div className="flex items-center gap-2">
                     <span>Facility</span>
                     {getSortIcon("facility")}
                   </div>
                 </Button>
               </TableHead>
               <TableHead className="w-[15%] font-semibold text-gray-700 text-base">
                 <Button
                   variant="ghost"
                   className={getSortButtonClass("area")}
                   onClick={() => handleSort("area")}
                 >
                   <div className="flex items-center gap-2">
                   <span>Area</span>
                     {getSortIcon("area")}
                   </div>
                 </Button>
               </TableHead>
               <TableHead className="w-[18%] font-semibold text-gray-700 text-base">
                 <Button
                   variant="ghost"
                   className={getSortButtonClass("jobTitle")}
                   onClick={() => handleSort("jobTitle")}
                 >
                   <div className="flex items-center gap-2">
                     <span>Job Title</span>
                     {getSortIcon("jobTitle")}
                   </div>
                 </Button>
               </TableHead>
               <TableHead className="w-[20%] font-semibold text-gray-700 text-base">Current Status</TableHead>
             </TableRow>
           </TableHeader>
                                                                                       <TableBody>
               {sortedEmployees.map((e, index) => {
                 const currentLevel = getCurrentLevel(e);
                 return (
                                     <TableRow key={e.employeeId} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-gray-100/50 transition-colors`}>
                     <TableCell className="font-medium text-base py-2">
                       <EmployeeDetailModal employee={e}>
                         <Button variant="ghost" className="h-auto p-0 justify-start hover:bg-transparent group">
                           <div className="text-left">
                             <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-base">{e.name || e.Employee}</div>
                             <div className="text-base text-gray-500">{e.employeeNumber || e.employeeId || e.Employee}</div>
                           </div>
                           <Eye className="w-4 h-4 ml-2 text-gray-400 group-hover:text-blue-500 transition-colors" />
                         </Button>
                       </EmployeeDetailModal>
                     </TableCell>
                     <TableCell className="text-gray-600 font-mono text-base py-2">{e.employeeNumber || e.employeeId || e.Employee}</TableCell>
                     <TableCell className="text-gray-700 text-base py-2">{e.facility || e.Facility}</TableCell>
                     <TableCell className="text-gray-700 text-base py-2">{e.area || e.Area}</TableCell>
                                           <TableCell className="text-gray-700 text-base py-2">{e.staffRoll || e.staffRoles || 'N/A'}</TableCell>
                     <TableCell className="text-base py-2">
                       <Badge 
                         variant={currentLevel.variant as any} 
                         className={`flex items-center gap-2 px-3 py-1 text-base font-medium ${currentLevel.bgColor} ${currentLevel.borderColor} ${currentLevel.textColor} ${currentLevel.className}`}
                       >
                         <currentLevel.icon className={`w-5 h-5 ${currentLevel.iconColor}`} />
                         {currentLevel.level}
                       </Badge>
                      </TableCell>
                   </TableRow>
                );
              })}
            </TableBody>
                 </Table>
       </div>

               {/* Compact Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 mb-6 flex justify-center">
            <CompactPagination
              currentPage={apiCurrentPage}
              totalPages={totalPages}
              onPageChange={setApiCurrentPage}
              totalItems={totalEmployees}
              itemsPerPage={itemsPerPage}
            />
          </div>
        )}
     </div>
   );
 }
