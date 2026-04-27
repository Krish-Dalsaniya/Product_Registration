const { sendError } = require('../utils/response');

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role_name)) {
      return sendError(res, 'FORBIDDEN', 'Access denied: insufficient permissions', 403);
    }
    next();
  };
};

module.exports = { requireRole };
