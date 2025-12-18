import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectCombobox, type MultiSelectOption } from "@/components/ui/multi-select-combobox";
import { Filter, X, Users2 } from "lucide-react";
import { ShineBorder } from "@/components/magicui/shine-border";
import { motion } from "framer-motion";

interface EmployeeFiltersProps {
  query: string;
  onQueryChange: (value: string) => void;
  selectedFacilities: string[];
  onFacilitiesChange: (value: string[]) => void;
  selectedArea: string;
  onAreaChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  selectedJobTitle: string;
  onJobTitleChange: (value: string) => void;
  onClearFilters: () => void;
  facilities: string[];
  areas: string[];
  statuses: string[];
  jobTitles: string[];
  // Employee count indicator props
  employees: any[];
  totalEmployees: number;
  isLoading: boolean;
  apiCurrentPage: number;
  totalPages: number;
}

export default function EmployeeFilters({
  query,
  onQueryChange,
  selectedFacilities,
  onFacilitiesChange,
  selectedArea,
  onAreaChange,
  selectedStatus,
  onStatusChange,
  selectedJobTitle,
  onJobTitleChange,
  onClearFilters,
  facilities,
  areas,
  statuses,
  jobTitles,
  employees,
  totalEmployees,
  isLoading,
  apiCurrentPage,
  totalPages
}: EmployeeFiltersProps) {
  // Convert facilities array to MultiSelectOption format
  const facilityOptions: MultiSelectOption[] = useMemo(() => 
    facilities.map(f => ({ value: f, label: f })),
    [facilities]
  );

  const hasFacilityFilter = selectedFacilities.length > 0;
  const hasActiveFilters = hasFacilityFilter || selectedArea !== "all" || selectedStatus !== "all" || selectedJobTitle !== "all" || query.trim();
  
  const activeFilterCount = [
    hasFacilityFilter,
    selectedArea !== "all", 
    selectedStatus !== "all",
    selectedJobTitle !== "all",
    query.trim()
  ].filter(Boolean).length;

  return (
    <div className="mb-6 -mt-4">
      {/* Search and Filters row */}
      <div className="w-full">
        <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
          {/* Search Section with ShineBorder around input */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Search:</span>
            <div className="relative inline-block">
              <ShineBorder
                borderWidth={1}
                duration={20}
                shineColor={["#8b5cf6", "#a855f7", "#c084fc"]}
                className="rounded-md"
              />
              <div className="relative w-[300px]">
              <ShineBorder borderWidth={1} duration={20} shineColor={["#8b5cf6", "#a855f7", "#c084fc"]} className="rounded-md" />
                <Input
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  placeholder="Employee name or ID"
                  className="h-10 text-sm pr-8 bg-white border-purple-200 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                {query && (
                  <button
                    onClick={() => onQueryChange('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="w-px h-8 bg-purple-300" />
          
          {/* Filters Section with ShineBorder around each dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-purple-900">Filters:</span>
            <div className="flex items-center gap-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <div className="relative inline-block">
                  <ShineBorder borderWidth={1} duration={20} shineColor={["#8b5cf6", "#a855f7", "#c084fc"]} className="rounded-md" />
                  <MultiSelectCombobox
                    options={facilityOptions}
                    selected={selectedFacilities}
                    onChange={onFacilitiesChange}
                    placeholder="All Facilities"
                    emptyText="No facilities found."
                    className="w-[180px]"
                    maxDisplayItems={1}
                  />
                </div>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <div className="relative inline-block">
                  <ShineBorder borderWidth={1} duration={20} shineColor={["#8b5cf6", "#a855f7", "#c084fc"]} className="rounded-md" />
                  <Select value={selectedArea} onValueChange={onAreaChange}>
                    <SelectTrigger id="area-filter" className="w-[120px] h-10 text-sm bg-white border-purple-200 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                      <SelectValue placeholder="All Areas" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-sm border border-purple-200 shadow-lg">
                      <SelectItem value="all">All Areas</SelectItem>
                      {areas.map((area) => (
                        <SelectItem key={area} value={area}>
                          {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <div className="relative inline-block">
                  <ShineBorder borderWidth={1} duration={20} shineColor={["#8b5cf6", "#a855f7", "#c084fc"]} className="rounded-md" />
                  <Select value={selectedStatus} onValueChange={onStatusChange}>
                    <SelectTrigger id="status-filter" className="w-[140px] h-10 text-sm bg-white border-purple-200 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] bg-white/95 backdrop-blur-sm border border-purple-200 shadow-lg">
                      <SelectItem value="all">All Statuses</SelectItem>
                      {statuses.map((status) => (
                        <SelectItem key={status || 'unknown'} value={status || ''}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <div className="relative inline-block">
                  <ShineBorder borderWidth={1} duration={20} shineColor={["#8b5cf6", "#a855f7", "#c084fc"]} className="rounded-md" />
                  <Select value={selectedJobTitle} onValueChange={onJobTitleChange}>
                    <SelectTrigger id="job-title-filter" className="w-[120px] h-10 text-sm bg-white border-purple-200 shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                      <SelectValue placeholder="All Job Titles" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] bg-white/95 backdrop-blur-sm border border-purple-200 shadow-lg">
                      <SelectItem value="all">All Job Titles</SelectItem>
                      {jobTitles.map((jobTitle) => (
                        <SelectItem key={jobTitle || 'unknown'} value={jobTitle || ''}>
                          {jobTitle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Clear Filters Button with count badge */}
          {hasActiveFilters && (
            <>
              <div className="w-px h-8 bg-purple-300" />
              <div className="relative">
                <Button
                  variant="default"
                  size="sm"
                  onClick={onClearFilters}
                  className="h-8 px-3 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg text-sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear filters
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium">
                    {activeFilterCount}
                  </span>
                </Button>
              </div>
            </>
          )}

          {/* Active Filter Tags - Inline */}
          {hasActiveFilters && (
            <>
              <div className="w-px h-8 bg-purple-300" />
              <div className="flex items-center gap-2 flex-wrap">
                {selectedFacilities.length > 0 && (
                  selectedFacilities.length <= 2 ? (
                    selectedFacilities.map((facility) => (
                      <motion.span key={facility} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium shadow-sm border border-purple-200">
                        <Filter className="w-3 h-3" />
                        {facility}
                      </motion.span>
                    ))
                  ) : (
                    <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium shadow-sm border border-purple-200">
                      <Filter className="w-3 h-3" />
                      {selectedFacilities.length} facilities
                    </motion.span>
                  )
                )}
                {selectedArea !== "all" && (
                  <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium shadow-sm border border-indigo-200">
                    <Filter className="w-3 h-3" />
                    {selectedArea}
                  </motion.span>
                )}
                {selectedStatus !== "all" && (
                  <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-medium shadow-sm border border-cyan-200">
                    <Filter className="w-3 h-3" />
                    {selectedStatus}
                  </motion.span>
                )}
                {selectedJobTitle !== "all" && (
                  <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium shadow-sm border border-emerald-200">
                    <Filter className="w-3 h-3" />
                    {selectedJobTitle}
                  </motion.span>
                )}
                {query.trim() && (
                  <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium shadow-sm border border-amber-200">
                    <Filter className="w-3 h-3" />
                    "{query}"
                  </motion.span>
                )}
              </div>
            </>
          )}

          {/* Spacer to push count indicator to the right */}
          <div className="flex-1" />

          {/* Employee Count Indicator - Rightmost with larger size */}
          <div className="w-px h-8 bg-purple-300" />
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <Users2 className="h-6 w-6 text-white" />
            </div>
            <div className="flex flex-col">
              {isLoading ? (
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                  <span className="text-sm font-medium text-slate-600">Loading...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-slate-800">
                      {employees.length.toLocaleString()}
                    </span>
                    <span className="text-sm text-slate-500">of</span>
                    <span className="text-lg font-bold text-slate-800">
                      {totalEmployees.toLocaleString()}
                    </span>
                    <span className="text-sm text-slate-500">employees</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}
