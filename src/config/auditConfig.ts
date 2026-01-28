import {
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  UserPlus,
  FileText,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Audit action types - must match backend AuditActions constants
 */
export const AuditActions = {
  TRAINING_SCHEDULED: 'TRAINING_SCHEDULED',
  TRAINING_COMPLETED: 'TRAINING_COMPLETED',
  DATE_EDITED: 'DATE_EDITED',
  CONFERENCE_APPROVED: 'CONFERENCE_APPROVED',
  CONFERENCE_REJECTED: 'CONFERENCE_REJECTED',
  NOTES_UPDATED: 'NOTES_UPDATED',
  ADVISOR_CHANGED: 'ADVISOR_CHANGED',
  ADVISOR_ADDED: 'ADVISOR_ADDED',
} as const;

export type AuditActionType = typeof AuditActions[keyof typeof AuditActions];

/**
 * Configuration for displaying each audit action type
 */
export interface ActionDisplayConfig {
  label: string;
  color: string;
  icon: LucideIcon;
  bgColor: string;
}

/**
 * Action type display configuration
 * Defines how each action type should be displayed in the UI
 */
export const actionConfig: Record<string, ActionDisplayConfig> = {
  [AuditActions.TRAINING_SCHEDULED]: { 
    label: "Training Scheduled", 
    color: "text-yellow-700", 
    icon: Clock,
    bgColor: "bg-yellow-50 border-yellow-200"
  },
  [AuditActions.TRAINING_COMPLETED]: { 
    label: "Training Completed", 
    color: "text-blue-700", 
    icon: CheckCircle,
    bgColor: "bg-blue-50 border-blue-200"
  },
  [AuditActions.DATE_EDITED]: { 
    label: "Date Edited", 
    color: "text-orange-700", 
    icon: Edit,
    bgColor: "bg-orange-50 border-orange-200"
  },
  [AuditActions.CONFERENCE_APPROVED]: { 
    label: "Conference Approved", 
    color: "text-green-700", 
    icon: CheckCircle,
    bgColor: "bg-green-50 border-green-200"
  },
  [AuditActions.CONFERENCE_REJECTED]: { 
    label: "Conference Rejected", 
    color: "text-red-700", 
    icon: XCircle,
    bgColor: "bg-red-50 border-red-200"
  },
  [AuditActions.NOTES_UPDATED]: { 
    label: "Notes Updated", 
    color: "text-yellow-700", 
    icon: FileText,
    bgColor: "bg-yellow-50 border-yellow-200"
  },
  [AuditActions.ADVISOR_CHANGED]: { 
    label: "Advisor Changed", 
    color: "text-purple-700", 
    icon: Users,
    bgColor: "bg-purple-50 border-purple-200"
  },
  [AuditActions.ADVISOR_ADDED]: { 
    label: "Advisor Added", 
    color: "text-indigo-700", 
    icon: UserPlus,
    bgColor: "bg-indigo-50 border-indigo-200"
  },
};

/**
 * Default action display config for unknown action types
 */
export const defaultActionConfig: ActionDisplayConfig = {
  label: "Unknown Action",
  color: "text-gray-700",
  icon: FileText,
  bgColor: "bg-gray-50 border-gray-200"
};

/**
 * Get action display info with fallback for unknown actions
 */
export function getActionInfo(action: string): ActionDisplayConfig {
  return actionConfig[action] || { 
    ...defaultActionConfig,
    label: action // Use the raw action name if unknown
  };
}

/**
 * Get all available action types for filter dropdowns
 */
export function getActionTypes(): string[] {
  return Object.keys(actionConfig);
}
