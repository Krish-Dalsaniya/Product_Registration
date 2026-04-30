const db = require('../config/db');
const { sendSuccess } = require('../utils/response');
const { parsePagination } = require('../utils/pagination');

const getUsers = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req);
  const { role } = req.query;

  try {
    let queryText = `SELECT *, COUNT(*) OVER() as total_count FROM v_admin_user_panel`;
    const params = [limit, offset];

    if (role) {
      queryText += ` WHERE role_name::text = $3`;
      params.push(role);
    }

    queryText += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;

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
    const designerCount = await db.query("SELECT COUNT(*) FROM designer_profiles");
    const salesCount = await db.query("SELECT COUNT(*) FROM sales_profiles");
    const maintenanceCount = await db.query("SELECT COUNT(*) FROM maintenance_profiles");
    const teamCount = await db.query("SELECT COUNT(*) FROM teams");

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
  const { full_name, email, password, role_name } = req.body;

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

    sendSuccess(res, result.rows[0], null, 201);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: { message: 'Email already exists' } });
    }
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
  createUser
};

