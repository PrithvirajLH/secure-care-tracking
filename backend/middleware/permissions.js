const { canEditCompletedDate, getCurrentUser } = require('../config/permissions');

/**
 * Middleware to check if user has permission to edit completed dates
 */
function requireEditCompletedDatePermission(req, res, next) {
  const userIdentifier = getCurrentUser(req);
  
  if (!userIdentifier) {
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'User not identified. Authentication required.' 
    });
  }
  
  if (!canEditCompletedDate(userIdentifier)) {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'You do not have permission to edit completed dates.' 
    });
  }
  
  // Attach user info to request for use in route handlers
  req.user = { identifier: userIdentifier };
  next();
}

module.exports = {
  requireEditCompletedDatePermission
};

