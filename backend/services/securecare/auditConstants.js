/**
 * Shared audit log constants
 * Used by both SQL Server (audit.js) and Azure Table Storage (auditAzureTable.js) implementations
 */

// Action type constants for consistency across the application
const AuditActions = {
  TRAINING_SCHEDULED: 'TRAINING_SCHEDULED',
  TRAINING_COMPLETED: 'TRAINING_COMPLETED',
  DATE_EDITED: 'DATE_EDITED',
  CONFERENCE_APPROVED: 'CONFERENCE_APPROVED',
  CONFERENCE_REJECTED: 'CONFERENCE_REJECTED',
  NOTES_UPDATED: 'NOTES_UPDATED',
  ADVISOR_CHANGED: 'ADVISOR_CHANGED',
  ADVISOR_ADDED: 'ADVISOR_ADDED',
};

// Human-readable labels for each action (can be used by frontend)
const AuditActionLabels = {
  [AuditActions.TRAINING_SCHEDULED]: 'Training Scheduled',
  [AuditActions.TRAINING_COMPLETED]: 'Training Completed',
  [AuditActions.DATE_EDITED]: 'Date Edited',
  [AuditActions.CONFERENCE_APPROVED]: 'Conference Approved',
  [AuditActions.CONFERENCE_REJECTED]: 'Conference Rejected',
  [AuditActions.NOTES_UPDATED]: 'Notes Updated',
  [AuditActions.ADVISOR_CHANGED]: 'Advisor Changed',
  [AuditActions.ADVISOR_ADDED]: 'Advisor Added',
};

module.exports = {
  AuditActions,
  AuditActionLabels,
};
