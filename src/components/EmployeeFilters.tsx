import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X } from "lucide-react";

interface EmployeeFiltersProps {
  query: string;
  onQueryChange: (value: string) => void;
  selectedFacility: string;
  onFacilityChange: (value: string) => void;
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
}

export default function EmployeeFilters({
  query,
  onQueryChange,
  selectedFacility,
  onFacilityChange,
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
  jobTitles
}: EmployeeFiltersProps) {
  const hasActiveFilters = selectedFacility !== "all" || selectedArea !== "all" || selectedStatus !== "all" || selectedJobTitle !== "all";

  return (
    <div className="mb-6 space-y-4 bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-200/50">
      {/* Search Row */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by name, ID, facility, area"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-full sm:max-w-sm bg-white/90 border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Filters Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <Label className="text-sm font-semibold text-gray-800">Filters:</Label>
          </div>
          
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
            <div className="space-y-1">
              <Label htmlFor="facility-filter" className="text-xs text-gray-700 font-medium">Facility</Label>
              <Select value={selectedFacility} onValueChange={onFacilityChange}>
                <SelectTrigger id="facility-filter" className="w-full sm:w-[200px] bg-white/90 border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder="All Facilities" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg">
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
              <Label htmlFor="area-filter" className="text-xs text-gray-700 font-medium">Area</Label>
              <Select value={selectedArea} onValueChange={onAreaChange}>
                <SelectTrigger id="area-filter" className="w-full sm:w-[180px] bg-white/90 border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder="All Areas" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg">
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
              <Label htmlFor="status-filter" className="text-xs text-gray-700 font-medium">Current Status</Label>
              <Select value={selectedStatus} onValueChange={onStatusChange}>
                <SelectTrigger id="status-filter" className="w-full sm:w-[200px] bg-white/90 border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg">
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status || 'unknown'} value={status || ''}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Job Title Filter */}
            <div className="space-y-1">
              <Label htmlFor="job-title-filter" className="text-xs text-gray-700 font-medium">Job Title</Label>
              <Select value={selectedJobTitle} onValueChange={onJobTitleChange}>
                <SelectTrigger id="job-title-filter" className="w-full sm:w-[180px] bg-white/90 border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  <SelectValue placeholder="All Job Titles" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] bg-white/95 backdrop-blur-sm border border-gray-200 shadow-lg">
                  <SelectItem value="all">All Job Titles</SelectItem>
                  {jobTitles.map((jobTitle) => (
                    <SelectItem key={jobTitle || 'unknown'} value={jobTitle || ''}>
                      {jobTitle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="flex items-center gap-1 text-gray-700 hover:text-gray-900 bg-white/70 hover:bg-white/90 px-3 py-1 rounded-md border border-gray-200 shadow-sm"
          >
            <X className="w-3 h-3" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Results Summary */}
      <div className="text-sm text-gray-700 font-medium bg-white/70 rounded-lg p-3 border border-gray-200 shadow-sm">
        {hasActiveFilters && (
          <span className="ml-2">
            {selectedFacility !== "all" && <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium shadow-sm">Facility: {selectedFacility}</span>}
            {selectedArea !== "all" && <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-md text-xs font-medium shadow-sm ml-2">Area: {selectedArea}</span>}
            {selectedStatus !== "all" && <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-medium shadow-sm ml-2">Status: {selectedStatus}</span>}
            {selectedJobTitle !== "all" && <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs font-medium shadow-sm ml-2">Job Title: {selectedJobTitle}</span>}
          </span>
        )}
      </div>
    </div>
  );
}
