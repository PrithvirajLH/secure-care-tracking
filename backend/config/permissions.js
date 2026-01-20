// Permission configuration for role-based access control
// Users with permission to edit completed dates
// Configure via environment variable EDIT_COMPLETED_DATE_PERMISSIONS (comma-separated emails)
// Example: EDIT_COMPLETED_DATE_PERMISSIONS=user1@example.com,user2@example.com

require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Get permissions from environment variable (comma-separated list)
const getPermissionsFromEnv = () => {
  const envPermissions = process.env.EDIT_COMPLETED_DATE_PERMISSIONS;
  if (!envPermissions) {
    return [];
  }
  
  // Split by comma and clean up whitespace
  return envPermissions
    .split(',')
    .map(email => email.trim())
    .filter(email => email.length > 0);
};

const EDIT_COMPLETED_DATE_PERMISSIONS = getPermissionsFromEnv();

/**
 * Check if a user has permission to edit completed dates
 * @param {string} userIdentifier - User email or identifier from auth header
 * @returns {boolean} - True if user has permission
 */
function canEditCompletedDate(userIdentifier) {
  if (!userIdentifier) return false;
  
  // Convert to lowercase for case-insensitive comparison
  const normalizedUser = userIdentifier.toLowerCase().trim();
  
  return EDIT_COMPLETED_DATE_PERMISSIONS.some(
    allowedUser => allowedUser.toLowerCase().trim() === normalizedUser
  );
}

/**
 * Get current user from request headers (Azure Easy Auth or custom header)
 * @param {object} req - Express request object
 * @returns {string|null} - User identifier or null
 */
function getCurrentUser(req) {
  // Try Azure Easy Auth header first
  if (req.headers['x-ms-client-principal-name']) {
    return req.headers['x-ms-client-principal-name'];
  }
  
  if (!isProduction) {
    // Try custom header (for development/testing)
    if (req.headers['x-user-email']) {
      return req.headers['x-user-email'];
    }
    
    // Try from query parameter (for development/testing only)
    if (req.query.user) {
      return req.query.user;
    }
  }
  
  return null;
}

module.exports = {
  EDIT_COMPLETED_DATE_PERMISSIONS,
  canEditCompletedDate,
  getCurrentUser
};

