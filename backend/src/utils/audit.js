const pool = require('../config/db');

/**
 * Logs an action to the audit_logs table
 * @param {Object} params
 * @param {string} params.userId - ID of the user performing the action
 * @param {string} params.action - e.g., 'LOGIN', 'CREATE_USER'
 * @param {string} params.entityType - e.g., 'USER', 'ROLE'
 * @param {string} params.entityId - ID of the entity affected
 * @param {string} [params.description] - Human readable description of the event
 * @param {Object} [params.oldValue] - State before change
 * @param {Object} [params.newValue] - State after change
 * @param {string} params.ipAddress - User IP address of the user
 */
const logAudit = async ({
  userId,
  action,
  entityType = null,
  entityId = null,
  description = null,
  oldValue = null,
  newValue = null,
  ipAddress = null
}) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, description, old_value, new_value, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userId,
        action,
        entityType,
        entityId,
        description,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        ipAddress
      ]
    );
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};

module.exports = { logAudit };
