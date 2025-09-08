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
import { CheckCircle, Clock, Award, Star, Trophy, Medal, Crown, Eye, ChevronUp, ChevronDown, Users2 } from "lucide-react";
import EmployeeDetailModal from "@/components/EmployeeDetailModal";
import { CompactPagination } from "@/components/ui/compact-pagination";
import { useEmployees } from "@/hooks/useEmployees";
import PageHeader from "@/components/PageHeader";
import EmployeeFilters from "@/components/EmployeeFilters";

export default function Employees() {
  const { state, dispatch } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedFacility, setSelectedFacility] = useState<string>("all");
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10); // Changed from 100 to test pagination
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>("all");

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
  } = useEmployees(stableFilters, itemsPerPage);

  // Sync local state with API state
  useEffect(() => {
    if (currentEmployees && currentEmployees.length > 0) {
      dispatch({ type: "setEmployees", payload: currentEmployees });
    }
  }, [currentEmployees, dispatch]);

  // Sync local currentPage with API currentPage
  useEffect(() => {
    if (apiCurrentPage !== currentPage) {
      setCurrentPage(apiCurrentPage);
    }
  }, [apiCurrentPage, currentPage]);

  // Debug logging for pagination and filters
  useEffect(() => {
    console.log('Employees: API Page changed to:', apiCurrentPage);
    console.log('Employees: Local Page changed to:', currentPage);
    console.log('Employees: Total Pages:', totalPages);
    console.log('Employees: Total Employees:', totalEmployees);
  }, [apiCurrentPage, currentPage, totalPages, totalEmployees]);

  useEffect(() => {
    console.log('Employees: Filters changed:', stableFilters);
  }, [stableFilters]);

  useEffect(() => {
    console.log('Employees: Sorting changed - Field:', sortField, 'Direction:', sortDirection);
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
    setCurrentPage(pageNumber);
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
    params.set("page", String(currentPage));
    setSearchParams(params, { replace: true });
  }, [state.filters.query, selectedFacility, selectedArea, selectedStatus, selectedJobTitle, sortField, sortDirection, currentPage]);

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
            return employee.awaiting === false; // awaiting = 0 means waiting for approval
          case "Conference Rejected":
            return employee.conferenceRejected === true;
          case "Not Started":
            return !employee.awardType && !employee.assignedDate;
          case "Level 1 In Progress":
            return employee.awardType === "Level 1" && employee.assignedDate && !employee.secureCareAwarded;
          case "Level 1":
            return employee.awardType === "Level 1" && employee.secureCareAwarded === true;
          case "Level 2 In Progress":
            return employee.awardType === "Level 2" && employee.assignedDate && !employee.secureCareAwarded;
          case "Level 2":
            return employee.awardType === "Level 2" && employee.secureCareAwarded === true;
          case "Level 3 In Progress":
            return employee.awardType === "Level 3" && employee.assignedDate && !employee.secureCareAwarded;
          case "Level 3":
            return employee.awardType === "Level 3" && employee.secureCareAwarded === true;
          case "Consultant In Progress":
            return employee.awardType === "Consultant" && employee.assignedDate && !employee.secureCareAwarded;
          case "Consultant":
            return employee.awardType === "Consultant" && employee.secureCareAwarded === true;
          case "Coach In Progress":
            return employee.awardType === "Coach" && employee.assignedDate && !employee.secureCareAwarded;
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
    
    // Debug logging for Sophie Allen
    if (employee.name === 'Sophia Allen' || employee.Employee === 'Sophia Allen') {
      console.log('Sophia Allen data:', {
        name: employee.name || employee.Employee,
        awardType: employee.awardType,
        assignedDate: employee.assignedDate,
        secureCareAwarded: employee.secureCareAwarded,
        awaiting: employee.awaiting
      });
    }
    
    // Handle both boolean and string values for secureCareAwarded
    const isAwarded = employee.secureCareAwarded === true || employee.secureCareAwarded === 1 || employee.secureCareAwarded === '1';
    
    // Determine status based on award type and completion status
    switch (employee.awardType) {
      case 'Coach':
        return { 
          level: isAwarded ? "Coach" : "Coach In Progress", 
          variant: "outline", 
          icon: Crown,
          iconColor: isAwarded ? "text-yellow-500" : "text-yellow-600",
          bgColor: "bg-gradient-to-r from-yellow-50 to-amber-50",
          borderColor: "border-yellow-200",
          textColor: "text-yellow-700",
          className: "shadow-sm hover:shadow-md transition-all duration-200"
        };
        
      case 'Consultant':
        return { 
          level: isAwarded ? "Consultant" : "Consultant In Progress", 
          variant: "outline", 
          icon: Trophy,
          iconColor: isAwarded ? "text-purple-500" : "text-purple-600",
          bgColor: "bg-gradient-to-r from-purple-50 to-indigo-50",
          borderColor: "border-purple-200",
          textColor: "text-purple-700",
          className: "shadow-sm hover:shadow-md transition-all duration-200"
        };
        
      case 'Level 3':
        return { 
          level: isAwarded ? "Level 3" : "Level 3 In Progress", 
          variant: "outline", 
          icon: Medal,
          iconColor: isAwarded ? "text-blue-500" : "text-blue-600",
          bgColor: "bg-gradient-to-r from-blue-50 to-cyan-50",
          borderColor: "border-blue-200",
          textColor: "text-blue-700",
          className: "shadow-sm hover:shadow-md transition-all duration-200"
        };
        
      case 'Level 2':
        return { 
          level: isAwarded ? "Level 2" : "Level 2 In Progress", 
          variant: "outline", 
          icon: Star,
          iconColor: isAwarded ? "text-orange-500" : "text-orange-600",
          bgColor: "bg-gradient-to-r from-orange-50 to-red-50",
          borderColor: "border-orange-200",
          textColor: "text-orange-700",
          className: "shadow-sm hover:shadow-md transition-all duration-200"
        };
        
      case 'Level 1':
        return { 
          level: isAwarded ? "Level 1" : "Level 1 In Progress", 
          variant: "outline", 
          icon: isAwarded ? Award : Clock,
          iconColor: isAwarded ? "text-green-500" : "text-yellow-600",
          bgColor: isAwarded ? "bg-gradient-to-r from-green-50 to-emerald-50" : "bg-gradient-to-r from-yellow-50 to-orange-50",
          borderColor: isAwarded ? "border-green-200" : "border-yellow-200",
          textColor: isAwarded ? "text-green-700" : "text-yellow-700",
          className: "shadow-sm hover:shadow-md transition-all duration-200"
        };
    }
    
    // Debug logging for fallback case
    if (employee.name === 'Sophia Allen' || employee.Employee === 'Sophia Allen') {
      console.log('Sophia Allen fallback - no matching case:', {
        awardType: employee.awardType,
        assignedDate: employee.assignedDate,
        secureCareAwarded: employee.secureCareAwarded,
        isAwarded
      });
    }
    
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

         // Note: Filtering and sorting are now handled by the API and local sorting respectively

  // Pagination is handled by the useEmployees hook
  // No need for local pagination logic

    // Reset to first page when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
    setApiCurrentPage(1);
  }, [state.filters.query, selectedFacility, selectedArea, selectedStatus, selectedJobTitle, sortField, sortDirection]);

               // Get unique facilities and areas for filter options
      // IMPORTANT: Use static lists for filter options to ensure they're always available
      const facilities = useMemo(() => [
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
      ].sort(), []);

      const areas = useMemo(() => {
        const areaList = [
          'Area 1', 'Area 2', 'Area 3', 'Area 4', 'Area 5', 'Area 6', 'Area 7', 'Area 8', 'Area 9', 'Area 10', 
          'Area 11', 'Area 12', 'Area 13', 'Area 14', 'Area 15', 'Area 16'
        ];
        return areaList.sort((a, b) => {
          // Extract numeric part and sort numerically
          const aNum = parseInt(a.replace(/\D/g, '')) || 0;
          const bNum = parseInt(b.replace(/\D/g, '')) || 0;
          return aNum - bNum;
        });
      }, []);

      // Get unique job titles for filter options
      const jobTitles = useMemo(() => [
        'Nurse', 'Doctor', 'Technician', 'Therapist', 'Administrator'
      ].sort(), []);

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
                     <TableCell className="font-medium text-base py-3">
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
                     <TableCell className="text-gray-600 font-mono text-base py-3">{e.employeeNumber || e.employeeId || e.Employee}</TableCell>
                     <TableCell className="text-gray-700 text-base py-3">{e.facility || e.Facility}</TableCell>
                     <TableCell className="text-gray-700 text-base py-3">{e.area || e.Area}</TableCell>
                                           <TableCell className="text-gray-700 text-base py-3">{e.staffRoll || e.staffRoles || 'N/A'}</TableCell>
                     <TableCell className="text-base py-3">
                       <Badge 
                         variant={currentLevel.variant as any} 
                         className={`flex items-center gap-2 px-3 py-1.5 text-base font-medium ${currentLevel.bgColor} ${currentLevel.borderColor} ${currentLevel.textColor} ${currentLevel.className}`}
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
          <div className="mt-6">
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
