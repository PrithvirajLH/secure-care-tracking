import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { trainingAPI, AuditLogEntry, AuditLogFilters } from "@/services/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CompactPagination } from "@/components/ui/compact-pagination";
import PageHeader from "@/components/PageHeader";
import { DatePicker } from "@/components/ui/date-picker";
import { useEditCompletedDatePermission } from "@/hooks/usePermissions";
import {
  ClipboardList,
  Search,
  Calendar,
  User,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  UserPlus,
  FileText,
  Users,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShieldX
} from "lucide-react";
import { format } from "date-fns";

// Action type display configuration
const actionConfig: Record<string, { label: string; color: string; icon: React.ElementType; bgColor: string }> = {
  TRAINING_SCHEDULED: { 
    label: "Training Scheduled", 
    color: "text-yellow-700", 
    icon: Clock,
    bgColor: "bg-yellow-50 border-yellow-200"
  },
  TRAINING_COMPLETED: { 
    label: "Training Completed", 
    color: "text-blue-700", 
    icon: CheckCircle,
    bgColor: "bg-blue-50 border-blue-200"
  },
  DATE_EDITED: { 
    label: "Date Edited", 
    color: "text-orange-700", 
    icon: Edit,
    bgColor: "bg-orange-50 border-orange-200"
  },
  CONFERENCE_APPROVED: { 
    label: "Conference Approved", 
    color: "text-green-700", 
    icon: CheckCircle,
    bgColor: "bg-green-50 border-green-200"
  },
  CONFERENCE_REJECTED: { 
    label: "Conference Rejected", 
    color: "text-red-700", 
    icon: XCircle,
    bgColor: "bg-red-50 border-red-200"
  },
  NOTES_UPDATED: { 
    label: "Notes Updated", 
    color: "text-yellow-700", 
    icon: FileText,
    bgColor: "bg-yellow-50 border-yellow-200"
  },
  ADVISOR_CHANGED: { 
    label: "Advisor Changed", 
    color: "text-purple-700", 
    icon: Users,
    bgColor: "bg-purple-50 border-purple-200"
  },
  ADVISOR_ADDED: { 
    label: "Advisor Added", 
    color: "text-indigo-700", 
    icon: UserPlus,
    bgColor: "bg-indigo-50 border-indigo-200"
  },
};

// Get action display info with fallback
function getActionInfo(action: string) {
  return actionConfig[action] || { 
    label: action, 
    color: "text-gray-700", 
    icon: FileText,
    bgColor: "bg-gray-50 border-gray-200"
  };
}

// Format timestamp for display
function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return format(date, "MMM d, yyyy h:mm a");
  } catch {
    return timestamp;
  }
}

export default function AuditLog() {
  // Check permission
  const { data: permissionData, isLoading: permissionLoading } = useEditCompletedDatePermission();
  const hasPermission = permissionData?.hasPermission ?? false;

  // Filter state
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 20,
    startDate: undefined,
    endDate: undefined,
    user: "all",
    action: "all",
    search: ""
  });

  // Expanded row state
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  // Date picker state
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Search debounce
  const [searchInput, setSearchInput] = useState("");

  // Fetch audit logs
  const { data: auditData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: () => trainingAPI.getAuditLogs(filters),
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch users for dropdown
  const { data: users = [] } = useQuery({
    queryKey: ["audit-users"],
    queryFn: () => trainingAPI.getAuditUsers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle filter changes
  const handleFilterChange = (key: keyof AuditLogFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== "page" ? 1 : value // Reset to page 1 when filters change
    }));
  };

  // Handle date changes
  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date);
    handleFilterChange("startDate", date ? format(date, "yyyy-MM-dd") : undefined);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date);
    handleFilterChange("endDate", date ? format(date, "yyyy-MM-dd") : undefined);
  };

  // Handle search with debounce
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    // Debounce search
    const timeoutId = setTimeout(() => {
      handleFilterChange("search", value);
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      startDate: undefined,
      endDate: undefined,
      user: "all",
      action: "all",
      search: ""
    });
    setStartDate(undefined);
    setEndDate(undefined);
    setSearchInput("");
  };

  // Get action types for dropdown
  const actionTypes = useMemo(() => Object.keys(actionConfig), []);

  const logs = auditData?.logs || [];
  const pagination = auditData?.pagination || { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: 20 };

  // Show loading while checking permission
  if (permissionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
          <span className="text-gray-500">Checking permissions...</span>
        </div>
      </div>
    );
  }

  // Show access denied if no permission
  if (!hasPermission) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="bg-red-50 rounded-full p-6 mb-4">
          <ShieldX className="h-16 w-16 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 max-w-md">
          You don't have permission to view the audit log. 
          Please contact your administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <PageHeader
        icon={ClipboardList}
        title="Audit Log"
        description="Track all changes made to employee records and training data"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="mb-6 bg-white/95 backdrop-blur-sm rounded-xl p-4 shadow-lg border border-gray-200/50">
        <div className="flex flex-wrap gap-4 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Search Employee</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Name or employee number..."
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Start Date */}
          <div className="min-w-[160px]">
            <label className="text-sm font-medium text-gray-700 mb-1 block">From Date</label>
            <DatePicker
              date={startDate}
              onDateChange={handleStartDateChange}
            />
          </div>

          {/* End Date */}
          <div className="min-w-[160px]">
            <label className="text-sm font-medium text-gray-700 mb-1 block">To Date</label>
            <DatePicker
              date={endDate}
              onDateChange={handleEndDateChange}
            />
          </div>

          {/* User Filter */}
          <div className="min-w-[200px]">
            <label className="text-sm font-medium text-gray-700 mb-1 block">User</label>
            <Select
              value={filters.user || "all"}
              onValueChange={(value) => handleFilterChange("user", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user} value={user}>
                    {user}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Filter */}
          <div className="min-w-[180px]">
            <label className="text-sm font-medium text-gray-700 mb-1 block">Action Type</label>
            <Select
              value={filters.action || "all"}
              onValueChange={(value) => handleFilterChange("action", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actionTypes.map((action) => (
                  <SelectItem key={action} value={action}>
                    {getActionInfo(action).label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters */}
          <Button
            variant="outline"
            onClick={clearFilters}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Clear
          </Button>
        </div>

        {/* Results summary */}
        <div className="mt-4 text-sm text-gray-600">
          Showing {logs.length} of {pagination.totalItems} audit entries
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white/95 backdrop-blur-sm shadow-lg border-gray-200 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 z-10">
            <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="w-[180px] font-semibold text-gray-700">Timestamp</TableHead>
              <TableHead className="w-[200px] font-semibold text-gray-700">User</TableHead>
              <TableHead className="w-[180px] font-semibold text-gray-700">Action</TableHead>
              <TableHead className="w-[200px] font-semibold text-gray-700">Employee</TableHead>
              <TableHead className="font-semibold text-gray-700">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                    <span className="text-gray-500">Loading audit logs...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="text-gray-500">
                    <ClipboardList className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No audit logs found</p>
                    <p className="text-sm mt-1">Try adjusting your filters</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log, index) => {
                const actionInfo = getActionInfo(log.action);
                const ActionIcon = actionInfo.icon;
                const isExpanded = expandedRow === log.auditId;

                return (
                  <React.Fragment key={log.auditId}>
                    <TableRow 
                      className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50/30"} hover:bg-gray-100/50 transition-colors cursor-pointer`}
                      onClick={() => setExpandedRow(isExpanded ? null : log.auditId)}
                    >
                      <TableCell className="py-3">
                        <Button variant="ghost" size="sm" className="p-1 h-auto">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="py-3 text-sm text-gray-600">
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700 truncate max-w-[180px]">
                            {log.userIdentifier}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge 
                          variant="outline" 
                          className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium ${actionInfo.bgColor} ${actionInfo.color}`}
                        >
                          <ActionIcon className="h-3.5 w-3.5" />
                          {actionInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        {log.employeeName ? (
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{log.employeeName}</div>
                            {log.employeeNumber && (
                              <div className="text-xs text-gray-500 font-mono">{log.employeeNumber}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-gray-600 max-w-[300px] truncate">
                        {log.details || "-"}
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded details row */}
                    {isExpanded && (
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={6} className="py-4 px-6">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase">Field Changed</label>
                              <p className="mt-1 font-medium text-gray-900">{log.fieldName || "N/A"}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase">Award Level</label>
                              <p className="mt-1 font-medium text-gray-900">{log.awardType || "N/A"}</p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase">Old Value</label>
                              <p className="mt-1 font-medium text-red-600 bg-red-50 px-2 py-1 rounded inline-block">
                                {log.oldValue || "None"}
                              </p>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-gray-500 uppercase">New Value</label>
                              <p className="mt-1 font-medium text-green-600 bg-green-50 px-2 py-1 rounded inline-block">
                                {log.newValue || "None"}
                              </p>
                            </div>
                            {log.ipAddress && (
                              <div>
                                <label className="text-xs font-medium text-gray-500 uppercase">IP Address</label>
                                <p className="mt-1 font-mono text-gray-600">{log.ipAddress}</p>
                              </div>
                            )}
                            <div className="col-span-2 md:col-span-3">
                              <label className="text-xs font-medium text-gray-500 uppercase">Full Description</label>
                              <p className="mt-1 text-gray-700">{log.details || "No additional details"}</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 mb-6 flex justify-center">
          <CompactPagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={(page) => handleFilterChange("page", page)}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
          />
        </div>
      )}
    </div>
  );
}
