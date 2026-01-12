import React, { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MultiSelectCombobox } from "@/components/ui/multi-select-combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Search, ChevronDown, ChevronUp, Eye, Users, Filter } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import EmployeeDetailModal from "@/components/EmployeeDetailModal";
import { trainingAPI } from "@/services/api";
import { fmt } from "@/config/awardTypes";

interface AggregatedEmployee {
  employeeId: number;
  employeeNumber: string;
  name: string;
  facility: string;
  area: string;
  staffRoll: string;
  // Level 1
  level1AssignedDate: string | null;
  level1CompletedDate: string | null;
  level1SecureCareAwarded: boolean | null;
  level1SecureCareAwardedDate: string | null;
  // Level 2
  level2ConferenceCompleted: string | null;
  level2Notes: string | null;
  level2AdvisorId: number | null;
  level2AdvisorName: string | null;
  level2StandingVideo: string | null;
  level2SleepingVideo: string | null;
  level2FeedGradVideo: string | null;
  level2SecureCareAwarded: boolean | null;
  level2SecureCareAwardedDate: string | null;
  level2Awaiting: boolean | null;
  // Level 3
  level3ConferenceCompleted: string | null;
  level3Notes: string | null;
  level3AdvisorId: number | null;
  level3AdvisorName: string | null;
  level3StandingVideo: string | null;
  level3NoHandnoSpeak: string | null;
  level3SleepingVideo: string | null;
  level3SecureCareAwarded: boolean | null;
  level3SecureCareAwardedDate: string | null;
  level3Awaiting: boolean | null;
  // Consultant
  consultantConferenceCompleted: string | null;
  consultantNotes: string | null;
  consultantAdvisorId: number | null;
  consultantAdvisorName: string | null;
  consultantSession1: string | null;
  consultantSession2: string | null;
  consultantSession3: string | null;
  consultantSecureCareAwarded: boolean | null;
  consultantSecureCareAwardedDate: string | null;
  consultantAwaiting: boolean | null;
  // Coach
  coachConferenceCompleted: string | null;
  coachNotes: string | null;
  coachAdvisorId: number | null;
  coachAdvisorName: string | null;
  coachSession1: string | null;
  coachSession2: string | null;
  coachSession3: string | null;
  coachSecureCareAwarded: boolean | null;
  coachSecureCareAwardedDate: string | null;
  coachAwaiting: boolean | null;
}

export default function EmployeeData() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("area");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewType, setViewType] = useState<"ready-for-level2" | "ready-for-level3" | "ready-for-consultant" | "ready-for-coach">("ready-for-level2");
  
  // Note: Column filters removed - only global filters are available

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['filter-options'],
    queryFn: () => trainingAPI.getFilterOptions(),
    staleTime: 10 * 60 * 1000,
  });

  // Build filters object - request large limit to get all data
  const filters = useMemo(() => ({
    facility: selectedFacilities.length > 0 ? selectedFacilities : undefined,
    area: selectedArea !== "all" ? selectedArea : undefined,
    jobTitle: selectedJobTitle !== "all" ? selectedJobTitle : undefined,
    search: searchQuery || undefined,
    sortBy,
    sortOrder,
    page: 1, // Always get page 1 since we're showing all
    limit: 10000, // Request large limit to get all data
    viewType: viewType
  }), [selectedFacilities, selectedArea, selectedJobTitle, searchQuery, sortBy, sortOrder, viewType]);

  // Fetch employee data
  const { data, isLoading, error } = useQuery({
    queryKey: ['all-employee-data', filters],
    queryFn: () => trainingAPI.getAllEmployeeData(filters),
    staleTime: 3 * 60 * 1000,
  });

  const allEmployees: AggregatedEmployee[] = data?.employees || [];
  const pagination = data?.pagination || { currentPage: 1, totalPages: 1, totalEmployees: 0, itemsPerPage: 50 };

  // Debug logging
  useEffect(() => {
    if (error) {
      console.error('Error fetching employee data:', error);
    }
    if (data) {
      console.log('Employee data received:', {
        viewType,
        employeeCount: allEmployees.length,
        pagination
      });
    }
  }, [error, data, viewType, allEmployees.length, pagination]);

  // Debug: Log first employee's Level 1 data to check what we're receiving
  useEffect(() => {
    if (allEmployees.length > 0) {
      const firstEmp = allEmployees[0];
      console.log('First employee Level 1 data:', {
        level1AssignedDate: firstEmp.level1AssignedDate,
        level1CompletedDate: firstEmp.level1CompletedDate,
        level1SecureCareAwarded: firstEmp.level1SecureCareAwarded,
        level1SecureCareAwardedDate: firstEmp.level1SecureCareAwardedDate,
        employeeNumber: firstEmp.employeeNumber,
        name: firstEmp.name
      });
    }
  }, [allEmployees]);

  // Apply client-side sorting - show all employees (no column filters)
  const filteredEmployees = useMemo(() => {
    let filtered = [...allEmployees];

    // Apply client-side sorting to ensure correct order
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      if (sortBy === 'area') {
        aValue = a.area || '';
        bValue = b.area || '';
        
        // Handle "Area X" format - extract number for numeric sorting
        const extractAreaNumber = (areaStr: string): number => {
          const match = areaStr.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        };
        
        const aNum = extractAreaNumber(String(aValue));
        const bNum = extractAreaNumber(String(bValue));
        
        // If both have numbers, sort numerically
        if (aNum !== 0 && bNum !== 0) {
          const numCompare = aNum - bNum;
          if (numCompare !== 0) {
            return sortOrder === 'asc' ? numCompare : -numCompare;
          }
        }
        
        // Otherwise, fall back to string comparison
        const areaCompare = String(aValue).localeCompare(String(bValue));
        if (areaCompare !== 0) {
          return sortOrder === 'asc' ? areaCompare : -areaCompare;
        }
        
        // If areas are equal, sort by name
        aValue = a.name || '';
        bValue = b.name || '';
        return sortOrder === 'asc' ? String(aValue).localeCompare(String(bValue)) : String(bValue).localeCompare(String(aValue));
      } else if (sortBy === 'name') {
        aValue = a.name || '';
        bValue = b.name || '';
      } else if (sortBy === 'facility') {
        aValue = a.facility || '';
        bValue = b.facility || '';
      } else if (sortBy === 'employeeId') {
        aValue = a.employeeNumber || '';
        bValue = b.employeeNumber || '';
      } else {
        aValue = (a as any)[sortBy] || '';
        bValue = (b as any)[sortBy] || '';
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const compare = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? compare : -compare;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [allEmployees, sortBy, sortOrder]);

  // Show all employees (no pagination - display all)
  const employees = filteredEmployees;

  // Load initial state from URL
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const facParam = searchParams.get("facility") ?? "";
    const fac = facParam && facParam !== "all" ? facParam.split(",").filter(f => f.trim()) : [];
    const ar = searchParams.get("area") ?? "all";
    const jt = searchParams.get("jobTitle") ?? "all";
    const sf = searchParams.get("sort") ?? "area";
    const sd = (searchParams.get("dir") as "asc" | "desc") ?? "asc";
    setSearchQuery(q);
    setSelectedFacilities(fac);
    setSelectedArea(ar);
    setSelectedJobTitle(jt);
    setSortBy(sf);
    setSortOrder(sd);
  }, []);

  // Note: No pagination - showing all data

  // Persist to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set("q", searchQuery);
    params.set("facility", selectedFacilities.length > 0 ? selectedFacilities.join(",") : "");
    params.set("area", selectedArea);
    params.set("jobTitle", selectedJobTitle);
    params.set("sort", sortBy);
    params.set("dir", sortOrder);
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedFacilities, selectedArea, selectedJobTitle, sortBy, sortOrder, searchParams, setSearchParams]);

  // Handle sort
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Column definitions with color coding
  const allColumns = [
    // White section - Basic Info
    { key: 'area', label: 'Area', bgColor: 'bg-white', section: 'white' },
    { key: 'facility', label: 'Facility', bgColor: 'bg-white', section: 'white' },
    { key: 'staffRoll', label: 'Role', bgColor: 'bg-white', section: 'white' },
    { key: 'name', label: 'Name', bgColor: 'bg-white', section: 'white' },
    { key: 'employeeNumber', label: 'ID', bgColor: 'bg-white', section: 'white' },
    // Purple section - Level 1
    { key: 'level1AssignedDate', label: 'L1 Assigned', bgColor: 'bg-purple-50', section: 'purple' },
    { key: 'level1CompletedDate', label: 'L1 Completed', bgColor: 'bg-purple-50', section: 'purple' },
    { key: 'level1Awarded', label: 'L1 Awarded', bgColor: 'bg-purple-50', section: 'purple' },
    // Red section - Level 2
    { key: 'level2ConferenceCompleted', label: 'L2 Conference', bgColor: 'bg-red-50', section: 'red' },
    { key: 'level2StandingVideo', label: 'L2 Standing', bgColor: 'bg-red-50', section: 'red' },
    { key: 'level2SleepingVideo', label: 'L2 Sleeping', bgColor: 'bg-red-50', section: 'red' },
    { key: 'level2FeedGradVideo', label: 'L2 Feeding', bgColor: 'bg-red-50', section: 'red' },
    { key: 'level2Awarded', label: 'L2 Awarded', bgColor: 'bg-red-50', section: 'red' },
    // Gray section - Level 3
    { key: 'level3ConferenceCompleted', label: 'L3 Conference', bgColor: 'bg-gray-50', section: 'gray' },
    { key: 'level3StandingVideo', label: 'L3 Standing', bgColor: 'bg-gray-50', section: 'gray' },
    { key: 'level3NoHandnoSpeak', label: 'L3 No Hand', bgColor: 'bg-gray-50', section: 'gray' },
    { key: 'level3SleepingVideo', label: 'L3 Challenge', bgColor: 'bg-gray-50', section: 'gray' },
    { key: 'level3Awarded', label: 'L3 Awarded', bgColor: 'bg-gray-50', section: 'gray' },
    // Green section - Consultant
    { key: 'consultantConferenceCompleted', label: 'Consultant Conf', bgColor: 'bg-green-50', section: 'green' },
    { key: 'consultantSession1', label: 'Consultant S1', bgColor: 'bg-green-50', section: 'green' },
    { key: 'consultantSession2', label: 'Consultant S2', bgColor: 'bg-green-50', section: 'green' },
    { key: 'consultantSession3', label: 'Consultant S3', bgColor: 'bg-green-50', section: 'green' },
    { key: 'consultantAwarded', label: 'Consultant Awarded', bgColor: 'bg-green-50', section: 'green' },
    // Orange section - Coach
    { key: 'coachConferenceCompleted', label: 'Coach Conf', bgColor: 'bg-orange-50', section: 'orange' },
    { key: 'coachSession1', label: 'Coach S1', bgColor: 'bg-orange-50', section: 'orange' },
    { key: 'coachSession2', label: 'Coach S2', bgColor: 'bg-orange-50', section: 'orange' },
    { key: 'coachSession3', label: 'Coach S3', bgColor: 'bg-orange-50', section: 'orange' },
    { key: 'coachAwarded', label: 'Coach Awarded', bgColor: 'bg-orange-50', section: 'orange' },
  ];

  // Filter columns based on viewType
  const columns = useMemo(() => {
    const baseColumns = allColumns.filter(col => 
      ['area', 'facility', 'staffRoll', 'name', 'employeeNumber'].includes(col.key)
    );
    
    if (viewType === 'ready-for-level2') {
      return [
        ...baseColumns,
        ...allColumns.filter(col => col.section === 'purple' || col.section === 'red')
      ];
    } else if (viewType === 'ready-for-level3') {
      return [
        ...baseColumns,
        ...allColumns.filter(col => col.section === 'purple' || col.section === 'red' || col.section === 'gray')
      ];
    } else if (viewType === 'ready-for-consultant') {
      return [
        ...baseColumns,
        ...allColumns.filter(col => col.section === 'purple' || col.section === 'red' || col.section === 'gray' || col.section === 'green')
      ];
    } else if (viewType === 'ready-for-coach') {
      return allColumns; // Show all columns
    }
    
    return allColumns; // Default fallback
  }, [viewType]);

  // Render cell content
  const renderCellContent = (employee: AggregatedEmployee, column: typeof columns[0]) => {
    switch (column.key) {
      case 'name':
        // Create a compatible employee object for the modal
        const modalEmployee = {
          employeeId: employee.employeeId,
          employeeNumber: employee.employeeNumber,
          name: employee.name,
          facility: employee.facility,
          area: employee.area,
          staffRoll: employee.staffRoll,
          awardType: null as any,
          // Include all level data for the modal
          ...employee
        };
        return (
          <div className="flex items-center gap-2">
            <EmployeeDetailModal employee={modalEmployee as any}>
              <Button variant="ghost" className="h-auto p-0 justify-start hover:bg-transparent group">
                <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {employee.name}
                </span>
                <Eye className="w-4 h-4 ml-2 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </Button>
            </EmployeeDetailModal>
          </div>
        );
      // Level 1 specific columns
      case 'level1AssignedDate':
        const assignedDate = employee.level1AssignedDate;
        // Check if date exists and is not null/empty
        if (assignedDate && assignedDate !== null && assignedDate !== '' && assignedDate !== 'NULL' && assignedDate !== 'null') {
          try {
            return fmt.date(assignedDate);
          } catch (e) {
            console.error('Error formatting assignedDate:', assignedDate, e);
            return String(assignedDate);
          }
        }
        return '—';
      case 'level1CompletedDate':
        const completedDate = employee.level1CompletedDate;
        if (completedDate && completedDate !== null && completedDate !== '' && completedDate !== 'NULL' && completedDate !== 'null') {
          try {
            return fmt.date(completedDate);
          } catch (e) {
            console.error('Error formatting completedDate:', completedDate, e);
            return String(completedDate);
          }
        }
        return '—';
      case 'level1Awarded':
        const awardedDate = employee.level1SecureCareAwardedDate;
        if (employee.level1SecureCareAwarded) {
          if (awardedDate && awardedDate !== null && awardedDate !== '' && awardedDate !== 'NULL' && awardedDate !== 'null') {
            return fmt.awarded(employee.level1SecureCareAwarded, awardedDate);
          }
          return 'Awarded'; // Awarded but no date
        }
        return '—';
      
      // Level 2 specific columns
      case 'level2ConferenceCompleted':
        return fmt.conference(employee.level2Awaiting, employee.level2ConferenceCompleted);
      case 'level2Awarded':
        return employee.level2SecureCareAwarded 
          ? fmt.awarded(employee.level2SecureCareAwarded, employee.level2SecureCareAwardedDate)
          : '—';
      
      // Level 3 specific columns
      case 'level3ConferenceCompleted':
        return fmt.conference(employee.level3Awaiting, employee.level3ConferenceCompleted);
      case 'level3Awarded':
        return employee.level3SecureCareAwarded 
          ? fmt.awarded(employee.level3SecureCareAwarded, employee.level3SecureCareAwardedDate)
          : '—';
      
      // Consultant specific columns
      case 'consultantConferenceCompleted':
        return fmt.conference(employee.consultantAwaiting, employee.consultantConferenceCompleted);
      case 'consultantAwarded':
        return employee.consultantSecureCareAwarded 
          ? fmt.awarded(employee.consultantSecureCareAwarded, employee.consultantSecureCareAwardedDate)
          : '—';
      
      // Coach specific columns
      case 'coachConferenceCompleted':
        return fmt.conference(employee.coachAwaiting, employee.coachConferenceCompleted);
      case 'coachAwarded':
        return employee.coachSecureCareAwarded 
          ? fmt.awarded(employee.coachSecureCareAwarded, employee.coachSecureCareAwardedDate)
          : '—';
      
      default:
        const value = (employee as any)[column.key];
        if (value === null || value === undefined || value === '') {
          return '—';
        }
        // Check if it's a date field (Video, Session columns)
        if (column.key.includes('Video') || column.key.includes('Session')) {
          return fmt.date(value);
        }
        // For text fields (Notes, Advisor, etc.)
        return String(value);
    }
  };

  // Sort indicator
  const SortIndicator = ({ columnKey }: { columnKey: string }) => {
    if (sortBy !== columnKey) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="w-4 h-4 inline ml-1 text-blue-600" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1 text-blue-600" />
    );
  };

  if (error) {
    return (
      <div className="p-6">
        <PageHeader icon={Database} title="Employee Data" description="Comprehensive view of all employee training data" />
        <div className="text-red-600">Error loading employee data: {(error as Error).message}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        icon={Database} 
        title="Award Readiness" 
        description={
          viewType === "ready-for-level2" 
            ? "Employees ready for Level 2 award (Level 1 awarded, all Level 2 videos completed)"
            : viewType === "ready-for-level3"
            ? "Employees ready for Level 3 award (Level 2 awarded, all Level 3 videos completed)"
            : viewType === "ready-for-consultant"
            ? "Employees ready for Consultant award (Level 3 awarded, all Consultant sessions completed)"
            : "Employees ready for Coach award (Consultant awarded, all Coach sessions completed)"
        }
      >
        <div className="flex items-center gap-2">
          <Select value={viewType} onValueChange={(v: "ready-for-level2" | "ready-for-level3" | "ready-for-consultant" | "ready-for-coach") => { setViewType(v); }}>
            <SelectTrigger className="w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ready-for-level2">Ready for Level 2 Award</SelectItem>
              <SelectItem value="ready-for-level3">Ready for Level 3 Award</SelectItem>
              <SelectItem value="ready-for-consultant">Ready for Consultant Award</SelectItem>
              <SelectItem value="ready-for-coach">Ready for Coach Award</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              className="pl-10 w-64"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filters</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2 space-y-2">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Facility</label>
                  {filterOptions && (
                    <MultiSelectCombobox
                      options={filterOptions.facilities.map(f => ({ value: f, label: f }))}
                      selected={selectedFacilities}
                      onChange={setSelectedFacilities}
                      placeholder="Select facilities..."
                    />
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Area</label>
                  <Select value={selectedArea} onValueChange={setSelectedArea}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Areas</SelectItem>
                      {filterOptions?.areas.map(area => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">Job Title</label>
                  <Select value={selectedJobTitle} onValueChange={setSelectedJobTitle}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Job Titles</SelectItem>
                      {filterOptions?.jobTitles.map(title => (
                        <SelectItem key={title} value={title}>{title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Employee Count Indicator - Top Right */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-sm">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div className="flex flex-col">
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                  <span className="text-xs font-medium text-slate-600">Loading...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1">
                  <span className="text-sm font-bold text-slate-800">
                    {filteredEmployees.length.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500">records</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </PageHeader>

      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        <div className="overflow-x-auto max-w-[calc(100vw-4rem)]">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead 
                    key={column.key}
                    className={`${column.bgColor} sticky top-0 z-10 hover:bg-opacity-80 transition-colors whitespace-nowrap text-center`}
                  >
                    <div 
                      className="flex items-center justify-center gap-1 cursor-pointer"
                      onClick={() => handleSort(column.key)}
                    >
                      <span className="font-semibold text-gray-900 text-xs">{column.label}</span>
                      <SortIndicator columnKey={column.key} />
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-gray-600">Loading employee data...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-8 text-gray-500">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee, index) => (
                  <TableRow 
                    key={employee.employeeId} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-gray-100/50 transition-colors`}
                  >
                    {columns.map((column) => (
                      <TableCell 
                        key={column.key}
                        className={`${column.bgColor} py-2 px-2 text-xs whitespace-nowrap text-center`}
                      >
                        {renderCellContent(employee, column)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

      </div>
    </div>
  );
}

