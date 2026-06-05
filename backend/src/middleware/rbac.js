const { sendError } = require('../utils/response');
const { pool } = require('../config/db');
const redisClient = require('../config/redis');

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role_name)) {
      return sendError(res, 'FORBIDDEN', 'Access denied: insufficient permissions', 403);
    }
    next();
  };
};

const requirePermission = (permissionKey) => {
  return async (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
    }
    
    // Admin bypasses all permission checks
    if (req.user.role_name === 'Admin') {
      return next();
    }

    try {
      let roleId = req.user.role_id;
      
      // Fallback for older tokens that don't have role_id
      if (!roleId) {
        const userRes = await pool.query('SELECT role_id FROM users WHERE user_id = $1', [req.user.user_id]);
        if (userRes.rows.length > 0) {
          roleId = userRes.rows[0].role_id;
          req.user.role_id = roleId; // Attach for subsequent use
        } else {
          return sendError(res, 'FORBIDDEN', 'User not found', 403);
        }
      }

      const cacheKey = `user_perms:${roleId}`;
      let permissions = [];
      
      // Try to get from cache
      if (redisClient && redisClient.isReady) {
        const cached = await redisClient.get(cacheKey);
        if (cached) permissions = JSON.parse(cached);
      }

      // If not in cache, fetch from DB
      if (!permissions.length) {
        const result = await pool.query(`
          SELECT p.permission_key 
          FROM permissions p
          JOIN role_permissions rp ON p.permission_id = rp.permission_id
          WHERE rp.role_id = $1
        `, [roleId]);
        
        permissions = result.rows.map(r => r.permission_key);
        
        // Save to cache for 1 hour
        if (redisClient && redisClient.isReady) {
          await redisClient.setEx(cacheKey, 3600, JSON.stringify(permissions));
        }
      }

      // Proxy '.view' to check for either 'tech_view' or 'comm_view'
      if (permissionKey.endsWith('.view')) {
        const modulePrefix = permissionKey.split('.')[0];
        if (permissions.includes(`${modulePrefix}.tech_view`) || permissions.includes(`${modulePrefix}.comm_view`)) {
          return next();
        }
      }

      if (permissions.includes(permissionKey)) {
        return next();
      }

      return sendError(res, 'FORBIDDEN', `Access denied: missing ${permissionKey} permission`, 403);
    } catch (error) {
      console.error('RBAC Error:', error);
      return sendError(res, 'INTERNAL_SERVER_ERROR', 'Failed to verify permissions', 500);
    }
  };
};

module.exports = { requireRole, requirePermission };
