const { sendError } = require('../utils/response');
const { pool } = require('../config/db');
const { redisClient } = require('../config/redis');

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

      // Determine if user has custom permissions
      let hasCustom = false;
      const customRes = await pool.query('SELECT has_custom_permissions FROM user_custom_access WHERE user_id = $1', [req.user.user_id]);
      if (customRes.rows.length > 0) {
        hasCustom = customRes.rows[0].has_custom_permissions;
      }

      let permissions = [];
      const cacheKey = hasCustom ? `user_custom_perms:${req.user.user_id}` : `role_perms:${roleId}`;

      // Try to get from cache
      if (redisClient && redisClient.isReady) {
        const cached = await redisClient.get(cacheKey);
        if (cached) permissions = JSON.parse(cached);
      }

      // If not in cache, fetch from DB
      if (!permissions.length) {
        if (hasCustom) {
          const result = await pool.query(`
            SELECT p.permission_key 
            FROM permissions p
            JOIN user_permissions up ON p.permission_id = up.permission_id
            WHERE up.user_id = $1
          `, [req.user.user_id]);
          permissions = result.rows.map(r => r.permission_key);
        } else {
          const result = await pool.query(`
            SELECT p.permission_key 
            FROM permissions p
            JOIN role_permissions rp ON p.permission_id = rp.permission_id
            WHERE rp.role_id = $1
          `, [roleId]);
          permissions = result.rows.map(r => r.permission_key);
        }
        
        // Save to cache for 1 hour
        if (redisClient && redisClient.isReady) {
          await redisClient.setEx(cacheKey, 3600, JSON.stringify(permissions));
        }
      }

      // Direct exact match
      if (permissions.includes(permissionKey)) {
        return next();
      }

      // Sub-section fallback logic:
      // If endpoint requires 'module.view' or 'module.create', grant if they have that action on ANY subsection.
      const parts = permissionKey.split('.');
      if (parts.length === 2) {
        const [modKey, action] = parts;
        if (['view', 'create', 'edit', 'delete'].includes(action)) {
          const hasSubsectionAccess = permissions.some(p => p.startsWith(`${modKey}.`) && p.endsWith(`.${action}`));
          if (hasSubsectionAccess) return next();
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
