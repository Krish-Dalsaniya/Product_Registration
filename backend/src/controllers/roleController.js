const { pool } = require('../config/db');

// Get all roles with their assigned permissions
exports.getAllRoles = async (req, res) => {
  try {
    const rolesQuery = `
      SELECT r.role_id, r.role_name, r.description, r.created_at,
             COALESCE(json_agg(rp.permission_id) FILTER (WHERE rp.permission_id IS NOT NULL), '[]') as permissions
      FROM roles r
      LEFT JOIN role_permissions rp ON r.role_id = rp.role_id
      GROUP BY r.role_id
      ORDER BY r.role_id
    `;
    const result = await pool.query(rolesQuery);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch roles' } });
  }
};

// Create a new role with given permissions
exports.createRole = async (req, res) => {
  const { role_name, description, permissions } = req.body;
  
  if (!role_name) {
    return res.status(400).json({ success: false, error: { message: 'Role name is required' } });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const roleInsert = await client.query(
      'INSERT INTO roles (role_name, description, created_at) VALUES ($1, $2, NOW()) RETURNING role_id',
      [role_name, description || '']
    );
    const roleId = roleInsert.rows[0].role_id;

    if (Array.isArray(permissions) && permissions.length > 0) {
      const values = permissions.map((p, i) => `($1, $${i + 2}, NOW())`).join(', ');
      const queryParams = [roleId, ...permissions];
      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id, granted_at) VALUES ${values}`,
        queryParams
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Role created successfully', data: { role_id: roleId } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating role:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to create role' } });
  } finally {
    client.release();
  }
};

// Update an existing role
exports.updateRole = async (req, res) => {
  const roleId = req.params.id;
  const { role_name, description, permissions } = req.body;

  if (parseInt(roleId) === 1) {
    return res.status(403).json({ success: false, error: { message: 'Cannot modify the Admin role' } });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    if (role_name || description !== undefined) {
      await client.query(
        'UPDATE roles SET role_name = COALESCE($1, role_name), description = COALESCE($2, description) WHERE role_id = $3',
        [role_name, description, roleId]
      );
    }

    if (Array.isArray(permissions)) {
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
      
      if (permissions.length > 0) {
        const values = permissions.map((p, i) => `($1, $${i + 2}, NOW())`).join(', ');
        const queryParams = [roleId, ...permissions];
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id, granted_at) VALUES ${values}`,
          queryParams
        );
      }
    }

    await client.query('COMMIT');

    // Clear Redis cache for this role
    const { redisClient } = require('../config/redis');
    if (redisClient && redisClient.isReady) {
      await redisClient.del(`role_perms:${roleId}`);
    }

    res.json({ success: true, message: 'Role updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating role:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update role' } });
  } finally {
    client.release();
  }
};

// Delete a role
exports.deleteRole = async (req, res) => {
  const roleId = req.params.id;

  if (parseInt(roleId) === 1) {
    return res.status(403).json({ success: false, error: { message: 'Cannot delete the Admin role' } });
  }

  try {
    const usersCount = await pool.query('SELECT COUNT(*) FROM users WHERE role_id = $1', [roleId]);
    if (parseInt(usersCount.rows[0].count) > 0) {
      return res.status(400).json({ success: false, error: { message: 'Cannot delete role assigned to users' } });
    }

    await pool.query('DELETE FROM roles WHERE role_id = $1', [roleId]);
    res.json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to delete role' } });
  }
};

// Get all permissions (grouped by module)
exports.getAllPermissions = async (req, res) => {
  try {
    const result = await pool.query('SELECT permission_id, permission_key, description FROM permissions ORDER BY permission_key');
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch permissions' } });
  }
};
