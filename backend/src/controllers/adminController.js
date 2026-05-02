const db = require('../config/db');
const { sendSuccess } = require('../utils/response');
const { parsePagination } = require('../utils/pagination');

const getUsers = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req);
  const { role } = req.query;

  try {
    // Use DISTINCT ON to prevent duplicate rows caused by users belonging to multiple teams
    let queryText = `
      SELECT DISTINCT ON (user_id) *, COUNT(*) OVER() as total_count
      FROM v_admin_user_panel
    `;
    const params = [limit, offset];

    if (role) {
      queryText += ` WHERE role_name::text = $3`;
      params.push(role);
    }

    queryText += ` ORDER BY user_id, created_at DESC LIMIT $1 OFFSET $2`;

    const result = await db.query(queryText, params);
    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    sendSuccess(res, result.rows.map(({ total_count, ...rest }) => rest), { page, limit, total });
  } catch (error) {
    next(error);
  }
};

const getUserById = async (req, res, next) => {
  const { userId } = req.params;

  try {
    const userResult = await db.query(
      `SELECT * FROM v_admin_user_panel WHERE user_id = $1`,
      [userId]
    );

    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    let profile = null;
    if (user.role_name === 'Designer') {
      const profileResult = await db.query(
        `SELECT dp.*, t.team_name, tm.is_lead 
         FROM designer_profiles dp
         LEFT JOIN team_members tm ON tm.designer_id = dp.designer_id
         LEFT JOIN teams t ON t.team_id = tm.team_id
         WHERE dp.designer_id = $1`,
        [userId]
      );
      profile = profileResult.rows[0];
    } else if (user.role_name === 'Sales') {
      const profileResult = await db.query(
        `SELECT sp.* FROM sales_profiles sp WHERE sp.sales_id = $1`,
        [userId]
      );
      profile = profileResult.rows[0];
    } else if (user.role_name === 'Maintenance') {
      const profileResult = await db.query(
        `SELECT mp.* FROM maintenance_profiles mp WHERE mp.maintenance_id = $1`,
        [userId]
      );
      profile = profileResult.rows[0];
    }

    sendSuccess(res, { ...user, profile });
  } catch (error) {
    next(error);
  }
};

const getDesigners = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req);
  try {
    const result = await db.query(
      `SELECT *, COUNT(*) OVER() as total_count 
       FROM v_designer_project_overview 
       ORDER BY designer_name 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    sendSuccess(res, result.rows.map(({ total_count, ...rest }) => rest), { page, limit, total });
  } catch (error) {
    next(error);
  }
};

const getTeams = async (req, res, next) => {
  const { role } = req.query;
  try {
    let queryText = `SELECT * FROM v_team_project_summary`;
    const params = [];
    
    if (role) {
      queryText += ` WHERE role_name::text = $1`;
      params.push(role);
    }
    
    queryText += ` ORDER BY team_name`;
    const result = await db.query(queryText, params);
    sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
};


const getSales = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req);
  try {
    const result = await db.query(
      `SELECT *, COUNT(*) OVER() as total_count 
       FROM v_sales_product_overview 
       ORDER BY sales_name 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    sendSuccess(res, result.rows.map(({ total_count, ...rest }) => rest), { page, limit, total });
  } catch (error) {
    next(error);
  }
};

const getMaintenance = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req);
  try {
    const result = await db.query(
      `SELECT *, COUNT(*) OVER() as total_count 
       FROM v_maintenance_overview 
       ORDER BY staff_name 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
    sendSuccess(res, result.rows.map(({ total_count, ...rest }) => rest), { page, limit, total });
  } catch (error) {
    next(error);
  }
};

const getAdminStats = async (req, res, next) => {
  try {
    const designerCount = await db.query(`
      SELECT COUNT(*) FROM designer_profiles dp
      JOIN users u ON dp.designer_id = u.user_id
      WHERE u.is_active = TRUE
    `);
    const salesCount = await db.query(`
      SELECT COUNT(*) FROM sales_profiles sp
      JOIN users u ON sp.sales_id = u.user_id
      WHERE u.is_active = TRUE
    `);
    const maintenanceCount = await db.query(`
      SELECT COUNT(*) FROM maintenance_profiles mp
      JOIN users u ON mp.maintenance_id = u.user_id
      WHERE u.is_active = TRUE
    `);
    const teamCount = await db.query(`
      SELECT COUNT(*) FROM teams t
      JOIN roles r ON t.role_id = r.role_id
      WHERE r.role_name = 'Designer'
    `);

    sendSuccess(res, {
      designers: parseInt(designerCount.rows[0].count),
      sales: parseInt(salesCount.rows[0].count),
      maintenance: parseInt(maintenanceCount.rows[0].count),
      teams: parseInt(teamCount.rows[0].count),
    });
  } catch (error) {
    next(error);
  }
};

const bcrypt = require('bcryptjs');

const createUser = async (req, res, next) => {
  const { full_name, email, password, role_name, team_id } = req.body;

  try {
    // Get role_id
    const roleResult = await db.query('SELECT role_id FROM roles WHERE role_name = $1', [role_name]);
    if (roleResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'Invalid role' } });
    }
    const role_id = roleResult.rows[0].role_id;

    const password_hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role_id) 
       VALUES ($1, $2, $3, $4) RETURNING user_id, full_name, email`,
      [full_name, email, password_hash, role_id]
    );

    // Create profile based on role
    const userId = result.rows[0].user_id;
    if (role_name === 'Designer') {
      await db.query('INSERT INTO designer_profiles (designer_id) VALUES ($1)', [userId]);
    } else if (role_name === 'Sales') {
      await db.query('INSERT INTO sales_profiles (sales_id) VALUES ($1)', [userId]);
    } else if (role_name === 'Maintenance') {
      await db.query('INSERT INTO maintenance_profiles (maintenance_id) VALUES ($1)', [userId]);
    }

    // Assign to team if provided
    if (team_id) {
      await db.query(
        'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)',
        [team_id, userId]
      );
    }

    sendSuccess(res, result.rows[0], null, 201);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: { message: 'Email already exists' } });
    }
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  const { userId } = req.params;
  const { full_name, email, role_name, team_id } = req.body;

  try {
    // Get role_id
    const roleResult = await db.query('SELECT role_id FROM roles WHERE role_name = $1', [role_name]);
    if (roleResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'Invalid role' } });
    }
    const role_id = roleResult.rows[0].role_id;

    const result = await db.query(
      `UPDATE users 
       SET full_name = $1, email = $2, role_id = $3 
       WHERE user_id = $4 RETURNING user_id, full_name, email`,
      [full_name, email, role_id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }

    // Sync team assignment
    await db.query('DELETE FROM team_members WHERE user_id = $1', [userId]);
    if (team_id) {
      await db.query(
        'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)',
        [team_id, userId]
      );
    }

    sendSuccess(res, result.rows[0], 'User updated successfully');
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: { message: 'Email already exists' } });
    }
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  const { userId } = req.params;

  try {
    // Start transaction
    await db.query('BEGIN');

    // 1. Delete profiles
    await db.query('DELETE FROM designer_profiles WHERE designer_id = $1', [userId]);
    await db.query('DELETE FROM sales_profiles WHERE sales_id = $1', [userId]);
    await db.query('DELETE FROM maintenance_profiles WHERE maintenance_id = $1', [userId]);
    
    // 2. Delete team memberships
    await db.query('DELETE FROM team_members WHERE user_id = $1', [userId]);

    // 3. Delete from users table
    const result = await db.query('DELETE FROM users WHERE user_id = $1 RETURNING user_id', [userId]);

    if (result.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }

    await db.query('COMMIT');
    sendSuccess(res, null, 'User deleted successfully');
  } catch (error) {
    await db.query('ROLLBACK');
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  getDesigners,
  getTeams,
  getSales,
  getMaintenance,
  getAdminStats,
  createUser,
  updateUser,
  deleteUser
};

