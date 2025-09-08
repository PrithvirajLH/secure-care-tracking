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
    
    if (filters.facility && filters.facility !== 'all') {
      params.append('facility', filters.facility);
    }
    
    if (filters.area && filters.area !== 'all') {
      params.append('area', filters.area);
    }
    
    if (filters.search) {
      params.append('search', filters.search);
    }
    
    const response = await fetch(`${this.baseURL}/securecare/employees/${encodeURIComponent(level)}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch employees: ${response.statusText}`);
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
    console.log('API: Scheduling training for employee:', employeeId, 'column:', columnName, 'date:', date);
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

  // Approve a conference completion
  async approveConference(employeeId: string, notes?: string): Promise<{ success: boolean }> {
    console.log('API: Approving conference for employee:', employeeId, 'notes:', notes);
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
    console.log('API: Approve conference response:', result);
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

  // Legacy compatibility methods
  async getAllTrainingData(): Promise<TrainingData[]> {
    // This would need to be implemented if still needed
    return [];
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
}

// Create and export a singleton instance
export const trainingAPI = new SecureCareAPI();

// Export the class for testing or custom instances
export default SecureCareAPI;