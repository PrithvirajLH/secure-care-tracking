// API service for SecureCare operations using new configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export interface TrainingUpdate {
  employeeId: string;
  requirementKey: string;
  scheduledDate?: Date;
  completedDate?: Date;
  action: 'schedule' | 'complete' | 'reschedule' | 'award';
}

export interface TrainingData {
  employeeId: string;
  requirementKey: string;
  scheduledDate?: Date;
  completedDate?: Date;
  awardedDate?: Date;
}

export interface EmployeeResponse {
  employees: any[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalEmployees: number;
    itemsPerPage: number;
  };
}

export interface DashboardSummary {
  stats: any;
  facilityRankings: {
    top: any[];
    bottom: any[];
  };
  recentActivity: Array<{
    id: string;
    type: string;
    employeeName: string;
    level: string;
    date: string;
    description: string;
  }>;
  activityCounts: Record<string, number>;
}

export interface AuditLogEntry {
  auditId: number;
  timestamp: string;
  userIdentifier: string;
  action: string;
  tableName: string;
  recordId: number | null;
  employeeNumber: string | null;
  employeeName: string | null;
  awardType: string | null;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  details: string | null;
  ipAddress: string | null;
}

export interface AuditLogsResponse {
  logs: AuditLogEntry[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  user?: string;
  action?: string;
  search?: string;
}

export interface AuditStats {
  actionCounts: Array<{ action: string; count: number }>;
  last7Days: Array<{ date: string; count: number }>;
  topUsers: Array<{ userIdentifier: string; count: number }>;
}

class SecureCareAPI {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // Get employees by level using new view-based approach
  async getEmployeesByLevel(level: string, filters: any = {}): Promise<EmployeeResponse> {
    const params = new URLSearchParams({
      page: (filters.page || 1).toString(),
      limit: (filters.limit || 50).toString()
    });
    
    // Handle facility filter - can be a string or array
    if (filters.facility) {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      // Append each facility as a separate query param for array support
      facilities.forEach(f => {
        if (f && f !== 'all') {
          params.append('facility', f);
        }
      });
    }
    
    if (filters.area && filters.area !== 'all') {
      params.append('area', filters.area);
    }
    
    if (filters.search) {
      params.append('search', filters.search);
    }
    
    if (filters.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    
    if (filters.jobTitle && filters.jobTitle !== 'all') {
      params.append('jobTitle', filters.jobTitle);
    }

    // Add optional server-side date filtering
    if (filters.dateField && filters.date) {
      params.append('dateField', filters.dateField);
      params.append('date', filters.date); // expected YYYY-MM-DD
    }
    
    // Add sorting parameters
    if (filters.sortBy) {
      params.append('sortBy', filters.sortBy);
    }
    
    if (filters.sortOrder) {
      params.append('sortOrder', filters.sortOrder);
    }
    
    const response = await fetch(`${this.baseURL}/securecare/employees/${encodeURIComponent(level)}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch employees: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get unique employees by level (one entry per employee with highest status)
  async getUniqueEmployeesByLevel(level: string, filters: any = {}): Promise<EmployeeResponse> {
    const params = new URLSearchParams({
      page: (filters.page || 1).toString(),
      limit: (filters.limit || 50).toString()
    });
    
    // Handle facility filter - can be a string or array
    if (filters.facility) {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      facilities.forEach(f => {
        if (f && f !== 'all') {
          params.append('facility', f);
        }
      });
    }
    
    if (filters.area && filters.area !== 'all') {
      params.append('area', filters.area);
    }
    
    if (filters.search) {
      params.append('search', filters.search);
    }
    
    if (filters.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    
    if (filters.jobTitle && filters.jobTitle !== 'all') {
      params.append('jobTitle', filters.jobTitle);
    }

    if (filters.dateField && filters.date) {
      params.append('dateField', filters.dateField);
      params.append('date', filters.date);
    }
    
    // Add sorting parameters
    if (filters.sortBy) {
      params.append('sortBy', filters.sortBy);
    }
    
    if (filters.sortOrder) {
      params.append('sortOrder', filters.sortOrder);
    }
    
    
    const response = await fetch(`${this.baseURL}/securecare/employees-unique/${encodeURIComponent(level)}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch unique employees: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get employee by ID
  async getEmployeeById(employeeId: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/securecare/employee/${employeeId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch employee: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get all SecureCareEmployee records for an employee across award types
  async getEmployeeLevels(employeeId: string): Promise<any[]> {
    const response = await fetch(`${this.baseURL}/securecare/employee/${employeeId}/levels`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch employee levels: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Schedule a training requirement
  async scheduleTraining(employeeId: string, columnName: string, date: Date): Promise<TrainingData> {
    const response = await fetch(`${this.baseURL}/securecare/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId,
        columnName,
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`, // Send date in YYYY-MM-DD format using local date components
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to schedule training: ${response.statusText}`);
    }

    return response.json();
  }

  // Mark a training requirement as complete
  async completeTraining(employeeId: string, scheduleColumn: string, completeColumn: string): Promise<TrainingData> {
    const response = await fetch(`${this.baseURL}/securecare/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId,
        scheduleColumn,
        completeColumn
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to complete training: ${response.statusText}`);
    }

    return response.json();
  }

  // Check if user has permission to edit completed dates
  async checkEditCompletedDatePermission(): Promise<{ hasPermission: boolean; userIdentifier: string | null }> {
    const response = await fetch(`${this.baseURL}/securecare/permissions/edit-completed-date`);
    if (!response.ok) {
      throw new Error(`Failed to check permissions: ${response.statusText}`);
    }
    return response.json();
  }

  // Edit completed date: update schedule column and clear actual column
  async editCompletedDate(employeeId: string, scheduleColumn: string, completeColumn: string, date: Date): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseURL}/securecare/edit-completed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId,
        scheduleColumn,
        completeColumn,
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to edit completed date: ${errorData.message || response.statusText}`);
    }

    return response.json();
  }

  // Approve a conference completion
  async approveConference(employeeId: string, notes?: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseURL}/securecare/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        employeeId,
        notes 
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to approve conference: ${response.statusText}`);
    }
    const result = await response.json();
    return result;
  }

  // Reject a conference completion
  async rejectConference(employeeId: string, notes?: string): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseURL}/securecare/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, notes })
    });
    if (!response.ok) {
      throw new Error(`Failed to reject conference: ${response.statusText}`);
    }
    return response.json();
  }

  // Get all advisors
  async getAdvisors(): Promise<any[]> {
    const response = await fetch(`${this.baseURL}/securecare/advisors`);

    if (!response.ok) {
      throw new Error(`Failed to fetch advisors: ${response.statusText}`);
    }

    return response.json();
  }

  // Add new advisor
  async addAdvisor(firstName: string, lastName: string): Promise<any> {
    const response = await fetch(`${this.baseURL}/securecare/advisors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName,
        lastName
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add advisor: ${response.statusText}`);
    }

    return response.json();
  }

  // Get filter options
  async getFilterOptions(): Promise<{ facilities: string[]; areas: string[]; jobTitles: string[] }> {
    const response = await fetch(`${this.baseURL}/securecare/filter-options`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch filter options: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Update employee notes
  async updateEmployeeNotes(employeeId: string, notes: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseURL}/securecare/update-notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId,
        notes
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update notes: ${response.statusText}`);
    }

    return response.json();
  }

  // Update employee advisor
  async updateEmployeeAdvisor(employeeId: string, advisorId: number | null): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseURL}/securecare/update-advisor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId,
        advisorId
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update advisor: ${response.statusText}`);
    }

    return response.json();
  }

  // Update employee notes for specific level/awardType
  async updateEmployeeNotesForLevel(employeeId: string, awardType: string, notes: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseURL}/securecare/update-notes-level`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId,
        awardType,
        notes
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update notes for level: ${response.statusText}`);
    }

    return response.json();
  }

  // Update employee advisor for specific level/awardType
  async updateEmployeeAdvisorForLevel(employeeId: string, awardType: string, advisorId: number | null): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseURL}/securecare/update-advisor-level`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId,
        awardType,
        advisorId
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update advisor for level: ${response.statusText}`);
    }

    return response.json();
  }

  // Legacy compatibility methods
  async getAllTrainingData(): Promise<TrainingData[]> {
    // This would need to be implemented if still needed
    return [];
  }

  // Aggregates: completions & counts
  async getCompletionsAggregates(filters: { startDate?: string; endDate?: string; level?: string; facility?: string; area?: string } = {}): Promise<any> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.level && filters.level !== 'all') params.append('level', filters.level);
    if (filters.facility && filters.facility !== 'all') params.append('facility', filters.facility);
    if (filters.area && filters.area !== 'all') params.append('area', filters.area);

    const response = await fetch(`${this.baseURL}/securecare/aggregates/completions?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch aggregates: ${response.statusText}`);
    }
    return response.json();
  }

  async getEmployeeTrainingData(employeeId: string): Promise<TrainingData[]> {
    // This would need to be implemented if still needed
    return [];
  }

  async updateTrainingData(update: TrainingUpdate): Promise<TrainingData> {
    // This would need to be implemented based on the action type
    throw new Error('Not implemented - use specific methods instead');
  }

  // Reschedule training (same as schedule for now)
  async rescheduleTraining(employeeId: string, columnName: string, date: Date): Promise<TrainingData> {
    return this.scheduleTraining(employeeId, columnName, date);
  }

  // Award training (read-only for now as per your specification)
  async awardTraining(employeeId: string, requirementKey: string, date: Date): Promise<TrainingData> {
    throw new Error('Awards are read-only in this version');
  }

  // Get all employee data (aggregated by employeeNumber with all levels)
  async getAllEmployeeData(filters: any = {}): Promise<EmployeeResponse> {
    const params = new URLSearchParams({
      page: (filters.page || 1).toString(),
      limit: (filters.limit || 100).toString()
    });
    
    // Add view type (all or ready-for-level2)
    if (filters.viewType) {
      params.append('viewType', filters.viewType);
    }
    
    // Handle facility filter - can be a string or array
    if (filters.facility) {
      const facilities = Array.isArray(filters.facility) ? filters.facility : [filters.facility];
      facilities.forEach(f => {
        if (f && f !== 'all') {
          params.append('facility', f);
        }
      });
    }
    
    if (filters.area && filters.area !== 'all') {
      params.append('area', filters.area);
    }
    
    if (filters.search) {
      params.append('search', filters.search);
    }
    
    if (filters.jobTitle && filters.jobTitle !== 'all') {
      params.append('jobTitle', filters.jobTitle);
    }
    
    // Add sorting parameters
    if (filters.sortBy) {
      params.append('sortBy', filters.sortBy);
    }
    
    if (filters.sortOrder) {
      params.append('sortOrder', filters.sortOrder);
    }
    
    const response = await fetch(`${this.baseURL}/securecare/employee-data?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch all employee data: ${response.statusText}`);
    }
    
    return response.json();
  }

  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await fetch(`${this.baseURL}/securecare/dashboard/summary`);
    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard summary: ${response.statusText}`);
    }
    return response.json();
  }

  // ==================
  // AUDIT LOG METHODS
  // ==================

  // Get audit logs with filtering and pagination
  async getAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLogsResponse> {
    const params = new URLSearchParams();
    
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.user && filters.user !== 'all') params.append('user', filters.user);
    if (filters.action && filters.action !== 'all') params.append('action', filters.action);
    if (filters.search) params.append('search', filters.search);
    
    const response = await fetch(`${this.baseURL}/securecare/audit-logs?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch audit logs: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get unique users for audit filter dropdown
  async getAuditUsers(): Promise<string[]> {
    const response = await fetch(`${this.baseURL}/securecare/audit-logs/users`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch audit users: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get audit log statistics
  async getAuditStats(): Promise<AuditStats> {
    const response = await fetch(`${this.baseURL}/securecare/audit-logs/stats`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch audit stats: ${response.statusText}`);
    }
    
    return response.json();
  }

}

// Create and export a singleton instance
export const trainingAPI = new SecureCareAPI();

// Export the class for testing or custom instances
export default SecureCareAPI;
