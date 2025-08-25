// API service for training data operations
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export interface TrainingUpdate {
  employeeId: string;
  requirementKey: string;
  scheduledDate?: Date;
  completedDate?: Date;
  action: 'schedule' | 'complete' | 'reschedule';
}

export interface TrainingData {
  employeeId: string;
  requirementKey: string;
  scheduledDate?: Date;
  completedDate?: Date;
  awardedDate?: Date;
}

class TrainingAPI {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // Schedule a training requirement
  async scheduleTraining(employeeId: string, requirementKey: string, date: Date): Promise<TrainingData> {
    const response = await fetch(`${this.baseURL}/training/schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId,
        requirementKey,
        scheduledDate: date.toISOString(),
        action: 'schedule'
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to schedule training: ${response.statusText}`);
    }

    return response.json();
  }

  // Mark a training requirement as complete
  async completeTraining(employeeId: string, requirementKey: string, date: Date): Promise<TrainingData> {
    const response = await fetch(`${this.baseURL}/training/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId,
        requirementKey,
        completedDate: date.toISOString(),
        action: 'complete'
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to complete training: ${response.statusText}`);
    }

    return response.json();
  }

  // Reschedule a training requirement
  async rescheduleTraining(employeeId: string, requirementKey: string, date: Date): Promise<TrainingData> {
    const response = await fetch(`${this.baseURL}/training/reschedule`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId,
        requirementKey,
        scheduledDate: date.toISOString(),
        action: 'reschedule'
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to reschedule training: ${response.statusText}`);
    }

    return response.json();
  }

  // Get all training data for an employee
  async getEmployeeTrainingData(employeeId: string): Promise<TrainingData[]> {
    const response = await fetch(`${this.baseURL}/training/employee/${employeeId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch training data: ${response.statusText}`);
    }

    return response.json();
  }

  // Get all training data
  async getAllTrainingData(): Promise<TrainingData[]> {
    const response = await fetch(`${this.baseURL}/training`);

    if (!response.ok) {
      throw new Error(`Failed to fetch training data: ${response.statusText}`);
    }

    return response.json();
  }

  // Update training data (generic method)
  async updateTrainingData(update: TrainingUpdate): Promise<TrainingData> {
    const response = await fetch(`${this.baseURL}/training/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update),
    });

    if (!response.ok) {
      throw new Error(`Failed to update training data: ${response.statusText}`);
    }

    return response.json();
  }
}

// Create and export a singleton instance
export const trainingAPI = new TrainingAPI();

// Export the class for testing or custom instances
export default TrainingAPI;
