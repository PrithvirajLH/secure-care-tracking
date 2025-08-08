import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import Papa from "papaparse";
import { toast } from "sonner";
import { CheckCircle, Clock, Award, Star, Trophy, Medal, Crown, Filter, X, Eye, ChevronUp, ChevronDown } from "lucide-react";
import EmployeeDetailModal from "@/components/EmployeeDetailModal";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";

export default function Employees() {
  const { state, dispatch } = useApp();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<string>("all");
  const [selectedArea, setSelectedArea] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

    const getCurrentLevel = (employee: any) => {
    // Check for current progress first (what they're working on now)
    // Coach in progress: has coachReliasAssigned but not coachAwarded
    if (employee.coachReliasAssigned && !employee.coachAwarded) return { 
      level: "Coach In Progress", 
      variant: "outline", 
      icon: Crown,
      iconColor: "text-yellow-600",
      bgColor: "bg-gradient-to-r from-yellow-50 to-amber-50",
      borderColor: "border-yellow-200",
      textColor: "text-yellow-700",
      className: "shadow-sm hover:shadow-md transition-all duration-200"
    };
    
    // Consultant in progress: has consultantReliasAssigned but not consultantAwarded
    if (employee.consultantReliasAssigned && !employee.consultantAwarded) return { 
      level: "Consultant In Progress", 
      variant: "outline", 
      icon: Trophy,
      iconColor: "text-purple-600",
      bgColor: "bg-gradient-to-r from-purple-50 to-indigo-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-700",
      className: "shadow-sm hover:shadow-md transition-all duration-200"
    };
    
    // Level 3 in progress: has level3ReliasAssigned but not level3Awarded
    if (employee.level3ReliasAssigned && !employee.level3Awarded) return { 
      level: "Level 3 In Progress", 
      variant: "outline", 
      icon: Medal,
      iconColor: "text-blue-600",
      bgColor: "bg-gradient-to-r from-blue-50 to-cyan-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-700",
      className: "shadow-sm hover:shadow-md transition-all duration-200"
    };
    
    // Level 2 in progress: has level2ReliasAssigned but not level2Awarded
    if (employee.level2ReliasAssigned && !employee.level2Awarded) return { 
      level: "Level 2 In Progress", 
      variant: "outline", 
      icon: Star,
      iconColor: "text-orange-600",
      bgColor: "bg-gradient-to-r from-orange-50 to-red-50",
      borderColor: "border-orange-200",
      textColor: "text-orange-700",
      className: "shadow-sm hover:shadow-md transition-all duration-200"
    };
    
    // Level 1 in progress: has level1ReliasAssigned but not level1Awarded
    if (employee.level1ReliasAssigned && !employee.level1Awarded) return { 
      level: "Level 1 In Progress", 
      variant: "outline", 
      icon: Clock,
      iconColor: "text-yellow-600",
      bgColor: "bg-gradient-to-r from-yellow-50 to-orange-50",
      borderColor: "border-yellow-200",
      textColor: "text-yellow-700",
      className: "shadow-sm hover:shadow-md transition-all duration-200"
    };

    // If not currently working on anything, show highest completed level
    if (employee.coachAwarded) return { 
      level: "Coach", 
      variant: "outline", 
      icon: Crown,
      iconColor: "text-yellow-500",
      bgColor: "bg-gradient-to-r from-yellow-50 to-amber-50",
      borderColor: "border-yellow-200",
      textColor: "text-yellow-700",
      className: "shadow-sm hover:shadow-md transition-all duration-200"
    };
    if (employee.consultantAwarded) return { 
      level: "Consultant", 
      variant: "outline", 
      icon: Trophy,
      iconColor: "text-purple-500",
      bgColor: "bg-gradient-to-r from-purple-50 to-indigo-50",
      borderColor: "border-purple-200",
      textColor: "text-purple-700",
      className: "shadow-sm hover:shadow-md transition-all duration-200"
    };
    if (employee.level3Awarded) return { 
      level: "Level 3", 
      variant: "outline", 
      icon: Medal,
      iconColor: "text-blue-500",
      bgColor: "bg-gradient-to-r from-blue-50 to-cyan-50",
      borderColor: "border-blue-200",
      textColor: "text-blue-700",
      className: "shadow-sm hover:shadow-md transition-all duration-200"
    };
    if (employee.level2Awarded) return { 
      level: "Level 2", 
      variant: "outline", 
      icon: Star,
      iconColor: "text-orange-500",
      bgColor: "bg-gradient-to-r from-orange-50 to-red-50",
      borderColor: "border-orange-200",
      textColor: "text-orange-700",
      className: "shadow-sm hover:shadow-md transition-all duration-200"
    };
    if (employee.level1Awarded) return { 
      level: "Level 1", 
      variant: "outline", 
      icon: Award,
      iconColor: "text-green-500",
      bgColor: "bg-gradient-to-r from-green-50 to-emerald-50",
      borderColor: "border-green-200",
      textColor: "text-green-700",
      className: "shadow-sm hover:shadow-md transition-all duration-200"
    };
    
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

    const employees = useMemo(() => {
    const q = state.filters.query.toLowerCase();
    let filtered = state.employees.filter(e => {
      const matchesQuery = `${e.name} ${e.employeeId} ${e.facility} ${e.area}`.toLowerCase().includes(q);
      const matchesFacility = !selectedFacility || selectedFacility === "all" || e.facility === selectedFacility;
      const matchesArea = !selectedArea || selectedArea === "all" || e.area === selectedArea;
      const matchesStatus = !selectedStatus || selectedStatus === "all" || getCurrentLevel(e).level === selectedStatus;
      return matchesQuery && matchesFacility && matchesArea && matchesStatus;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

             switch (sortField) {
         case "name":
           aValue = a.name.toLowerCase();
           bValue = b.name.toLowerCase();
           break;
         case "employeeId":
           aValue = a.employeeId.toLowerCase();
           bValue = b.employeeId.toLowerCase();
           break;
         case "facility":
           aValue = a.facility.toLowerCase();
           bValue = b.facility.toLowerCase();
           break;
         case "area":
           aValue = a.area.toLowerCase();
           bValue = b.area.toLowerCase();
           break;
         default:
           aValue = a.name.toLowerCase();
           bValue = b.name.toLowerCase();
       }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });

      return filtered;
    }, [state.employees, state.filters.query, selectedFacility, selectedArea, selectedStatus, sortField, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(employees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEmployees = employees.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [state.filters.query, selectedFacility, selectedArea, selectedStatus, sortField, sortDirection]);

   // Get unique facilities and areas for filter options
   const facilities = useMemo(() => {
     const uniqueFacilities = [...new Set(state.employees.map(e => e.facility))].sort();
     return uniqueFacilities;
   }, [state.employees]);

   const areas = useMemo(() => {
     const uniqueAreas = [...new Set(state.employees.map(e => e.area))].sort();
     return uniqueAreas;
   }, [state.employees]);

   // Get unique statuses for filter options
   const statuses = useMemo(() => {
     const uniqueStatuses = [...new Set(state.employees.map(e => getCurrentLevel(e).level))].sort();
     return uniqueStatuses;
   }, [state.employees]);

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
      <ChevronUp className="w-4 h-4 text-blue-600" /> : 
      <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  const getSortButtonClass = (field: string) => {
    const isActive = sortField === field;
    return `h-auto p-0 font-semibold hover:text-gray-900 hover:bg-transparent transition-all duration-200 ${
      isActive 
        ? 'text-blue-700 bg-blue-50 px-2 py-1 rounded-md' 
        : 'text-gray-700 hover:text-gray-900'
    }`;
  };

  const onImport = useCallback((file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data as any[];
        toast.success(`Parsed ${rows.length} rows from CSV`);
        // Map to Employee as needed in future iterations
      },
      error: () => toast.error("Failed to parse CSV"),
    });
  }, []);

  return (
    <div>
      <header className="mb-6">
        <h1>Employee Directory</h1>
        <p className="text-muted-foreground">Manage your employee roster and view basic training status</p>
      </header>

      <div className="mb-6 space-y-4">
        {/* Search and Actions Row */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Input
            placeholder="Search by name, ID, facility, area"
            value={state.filters.query}
            onChange={(e) => dispatch({ type: "setQuery", payload: e.target.value })}
            className="w-full sm:max-w-sm"
          />
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files && onImport(e.target.files[0])} />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>Import CSV</Button>
            <Button variant="secondary">Export</Button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Label className="text-sm font-medium text-gray-700">Filters:</Label>
            </div>
            
                         <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
               <div className="space-y-1">
                 <Label htmlFor="facility-filter" className="text-xs text-gray-600">Facility</Label>
                 <Select value={selectedFacility} onValueChange={setSelectedFacility}>
                   <SelectTrigger id="facility-filter" className="w-full sm:w-[200px]">
                     <SelectValue placeholder="All Facilities" />
                   </SelectTrigger>
                                      <SelectContent className="max-h-[300px]">
                      <SelectItem value="all">All Facilities</SelectItem>
                      {facilities.map((facility) => (
                        <SelectItem key={facility} value={facility}>
                          {facility}
                        </SelectItem>
                      ))}
                    </SelectContent>
                 </Select>
               </div>

               <div className="space-y-1">
                 <Label htmlFor="area-filter" className="text-xs text-gray-600">Area</Label>
                 <Select value={selectedArea} onValueChange={setSelectedArea}>
                   <SelectTrigger id="area-filter" className="w-full sm:w-[180px]">
                     <SelectValue placeholder="All Areas" />
                   </SelectTrigger>
                                      <SelectContent>
                      <SelectItem value="all">All Areas</SelectItem>
                      {areas.map((area) => (
                        <SelectItem key={area} value={area}>
                          {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                 </Select>
               </div>

               <div className="space-y-1">
                 <Label htmlFor="status-filter" className="text-xs text-gray-600">Current Status</Label>
                 <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                   <SelectTrigger id="status-filter" className="w-full sm:w-[200px]">
                     <SelectValue placeholder="All Statuses" />
                   </SelectTrigger>
                   <SelectContent className="max-h-[300px]">
                     <SelectItem value="all">All Statuses</SelectItem>
                     {statuses.map((status) => (
                       <SelectItem key={status} value={status}>
                         {status}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
             </div>
          </div>

                                           {/* Clear Filters Button */}
            {(selectedFacility && selectedFacility !== "all") || (selectedArea && selectedArea !== "all") || (selectedStatus && selectedStatus !== "all") ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedFacility("all");
                  setSelectedArea("all");
                  setSelectedStatus("all");
                }}
                className="flex items-center gap-1 text-gray-600 hover:text-gray-800"
              >
                <X className="w-3 h-3" />
                Clear Filters
              </Button>
            ) : null}
        </div>

                                   {/* Results Summary */}
          <div className="text-sm text-gray-600">
            Showing {employees.length} of {state.employees.length} employees
            {((selectedFacility && selectedFacility !== "all") || (selectedArea && selectedArea !== "all") || (selectedStatus && selectedStatus !== "all")) && (
              <span className="ml-2">
                {selectedFacility && selectedFacility !== "all" && <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs">Facility: {selectedFacility}</span>}
                {selectedArea && selectedArea !== "all" && <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs ml-2">Area: {selectedArea}</span>}
                {selectedStatus && selectedStatus !== "all" && <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs ml-2">Status: {selectedStatus}</span>}
              </span>
            )}
          </div>
      </div>

      <div className="rounded-lg border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <TableHead className="w-[25%] font-semibold text-gray-700">
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
              <TableHead className="w-[15%] font-semibold text-gray-700">
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
              <TableHead className="w-[20%] font-semibold text-gray-700">
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
              <TableHead className="w-[20%] font-semibold text-gray-700">
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
              <TableHead className="w-[20%] font-semibold text-gray-700">Current Status</TableHead>
            </TableRow>
          </TableHeader>
                     <TableBody>
             {currentEmployees.map((e, index) => {
               const currentLevel = getCurrentLevel(e);
               return (
                 <TableRow key={e.employeeId} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'} hover:bg-gray-100/50 transition-colors`}>
                   <TableCell className="font-medium">
                     <EmployeeDetailModal employee={e}>
                       <Button variant="ghost" className="h-auto p-0 justify-start hover:bg-transparent group">
                         <div className="text-left">
                           <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{e.name}</div>
                           <div className="text-sm text-gray-500">{e.employeeId}</div>
                         </div>
                         <Eye className="w-4 h-4 ml-2 text-gray-400 group-hover:text-blue-500 transition-colors" />
                       </Button>
                     </EmployeeDetailModal>
                   </TableCell>
                   <TableCell className="text-gray-600 font-mono text-sm">{e.employeeId}</TableCell>
                   <TableCell className="text-gray-700">{e.facility}</TableCell>
                   <TableCell className="text-gray-700">{e.area}</TableCell>
                   <TableCell>
                     <Badge 
                       variant={currentLevel.variant as any} 
                       className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium ${currentLevel.bgColor} ${currentLevel.borderColor} ${currentLevel.textColor} ${currentLevel.className}`}
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

       {/* Pagination */}
       {totalPages > 1 && (
         <div className="mt-6 flex items-center justify-between">
           <div className="text-sm text-gray-600">
             Showing {startIndex + 1} to {Math.min(endIndex, employees.length)} of {employees.length} employees
           </div>
           <Pagination>
             <PaginationContent>
               <PaginationItem>
                 <PaginationPrevious 
                   href="#"
                   onClick={(e) => {
                     e.preventDefault();
                     if (currentPage > 1) setCurrentPage(currentPage - 1);
                   }}
                   className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                 />
               </PaginationItem>
               
               {/* Page numbers */}
               {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                 <PaginationItem key={page}>
                   <PaginationLink
                     href="#"
                     onClick={(e) => {
                       e.preventDefault();
                       setCurrentPage(page);
                     }}
                     isActive={currentPage === page}
                   >
                     {page}
                   </PaginationLink>
                 </PaginationItem>
               ))}
               
               <PaginationItem>
                 <PaginationNext 
                   href="#"
                   onClick={(e) => {
                     e.preventDefault();
                     if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                   }}
                   className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                 />
               </PaginationItem>
             </PaginationContent>
           </Pagination>
         </div>
       )}
     </div>
   );
 }
