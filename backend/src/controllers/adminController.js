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
         LEFT JOIN team_members tm ON tm.user_id = dp.designer_id
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
    let queryText = `
      SELECT 
        v.*,
        t.description,
        t.product_name,
        t.product_description,
        t.team_lead_id,
        t.client_handler_id,
        COALESCE(
          (
            SELECT JSON_AGG(tm.user_id)
            FROM team_members tm
            WHERE tm.team_id = v.team_id
          ),
          '[]'::json
        ) as member_ids
      FROM v_team_project_summary v
      JOIN teams t ON t.team_id = v.team_id
    `;
    const params = [];
    
    if (role) {
      queryText += ` WHERE v.role_name::text = $1`;
      params.push(role);
    }
    
    queryText += ` ORDER BY v.team_name`;
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

let statsCache = {
  data: null,
  timestamp: 0
};

const fetchAdminStatsData = async () => {
  const now = Date.now();
  // 10-second cache to prevent DB hammering from multiple simultaneous sessions
  if (statsCache.data && (now - statsCache.timestamp < 10000)) {
    return statsCache.data;
  }

  // Consolidate separate queries into 1 single multi-count query for speed
  const queryText = `
    SELECT
      (SELECT COUNT(*) FROM designer_profiles dp JOIN users u ON dp.designer_id = u.user_id WHERE u.is_active = TRUE) as designers,
      (SELECT COUNT(*) FROM sales_profiles sp JOIN users u ON sp.sales_id = u.user_id WHERE u.is_active = TRUE) as sales,
      (SELECT COUNT(*) FROM maintenance_profiles mp JOIN users u ON mp.maintenance_id = u.user_id WHERE u.is_active = TRUE) as maintenance,
      (SELECT COUNT(*) FROM teams t JOIN roles r ON t.role_id = r.role_id WHERE r.role_name = 'Designer') as designer_teams,
      (SELECT COUNT(*) FROM teams t JOIN roles r ON t.role_id = r.role_id WHERE r.role_name = 'Sales') as sales_teams,
      (SELECT COUNT(*) FROM teams t JOIN roles r ON t.role_id = r.role_id WHERE r.role_name = 'Maintenance') as maintenance_teams,
      (SELECT COUNT(*) FROM products WHERE is_active = TRUE) as products,
      (SELECT COUNT(*) FROM customers) as customers,
      (SELECT COUNT(*) FROM pcb_master WHERE is_active = TRUE) as pcb,
      (SELECT COUNT(*) FROM electronics_part_master WHERE is_active = TRUE) as electronics,
      (SELECT COUNT(*) FROM electrical_part_master WHERE is_active = TRUE) as electrical,
      (SELECT COUNT(*) FROM STRUCTURAL_PART_MASTER WHERE is_active = TRUE) as structural,
      (SELECT COALESCE(SUM(quantity), 0) FROM finished_goods) as finished_goods_qty,
      (SELECT COUNT(*) FROM book_a_sale) as book_a_sale_count,
      (SELECT COALESCE(SUM(quantity), 0) FROM book_a_sale) as book_a_sale_qty,
      (SELECT COUNT(*) FROM support_tickets) as support_tickets_total,
      (SELECT COUNT(*) FROM support_tickets WHERE status IN ('Pending', 'In Progress')) as support_tickets_active
  `;

  const result = await db.query(queryText);
  const row = result.rows[0];

  const stats = {
    designers: parseInt(row.designers),
    sales: parseInt(row.sales),
    maintenance: parseInt(row.maintenance),
    designerTeams: parseInt(row.designer_teams),
    salesTeams: parseInt(row.sales_teams),
    maintenanceTeams: parseInt(row.maintenance_teams),
    teams: parseInt(row.designer_teams) + parseInt(row.sales_teams) + parseInt(row.maintenance_teams),
    products: parseInt(row.products),
    customers: parseInt(row.customers),
    finishedGoodsQty: parseInt(row.finished_goods_qty),
    bookASaleCount: parseInt(row.book_a_sale_count),
    bookASaleQty: parseInt(row.book_a_sale_qty),
    supportTicketsTotal: parseInt(row.support_tickets_total),
    supportTicketsActive: parseInt(row.support_tickets_active),
    inventory: {
      pcb: parseInt(row.pcb),
      electronics: parseInt(row.electronics),
      electrical: parseInt(row.electrical),
      structural: parseInt(row.structural)
    }
  };

  statsCache = { data: stats, timestamp: now };
  return stats;
};

const getAdminStats = async (req, res, next) => {
  try {
    const stats = await fetchAdminStatsData();
    sendSuccess(res, stats);
  } catch (error) {
    next(error);
  }
};

const bcrypt = require('bcryptjs');

const createUser = async (req, res, next) => {
  console.log('--- CREATE USER REQUEST ---');
  console.log('Body:', req.body);
  console.log('File:', req.file);
  const { full_name, email, password, role_name, team_id, team_ids } = req.body;

  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  let parsedTeamIds = team_ids;
  if (typeof team_ids === 'string') {
    try { parsedTeamIds = JSON.parse(team_ids); } 
    catch(e) { parsedTeamIds = [team_ids]; }
  }

  try {
    const result = await db.withTransaction(async (client) => {
        // Get role_id
        const roleResult = await client.query('SELECT role_id FROM roles WHERE role_name = $1', [role_name]);
        if (roleResult.rows.length === 0) {
          throw new Error('Invalid role');
        }
        const role_id = roleResult.rows[0].role_id;

        const password_hash = await bcrypt.hash(password, 10);
        const insertResult = await client.query(
          `INSERT INTO users (full_name, email, password_hash, role_id, image_url) 
           VALUES ($1, $2, $3, $4, $5) RETURNING user_id, full_name, email, image_url`,
          [full_name, email, password_hash, role_id, image_url]
        );

        // Create profile based on role
        const userId = insertResult.rows[0].user_id;
        if (role_name === 'Designer') {
          await client.query('INSERT INTO designer_profiles (designer_id) VALUES ($1)', [userId]);
        } else if (role_name === 'Sales') {
          await client.query('INSERT INTO sales_profiles (sales_id) VALUES ($1)', [userId]);
        } else if (role_name === 'Maintenance') {
          await client.query('INSERT INTO maintenance_profiles (maintenance_id) VALUES ($1)', [userId]);
        }

        // Assign to teams if provided
        if (Array.isArray(parsedTeamIds) && parsedTeamIds.length > 0) {
          for (const tId of parsedTeamIds) {
            if (tId) {
              await client.query(
                'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)',
                [tId, userId]
              );
            }
          }
        } else if (team_id) {
          await client.query(
            'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)',
            [team_id, userId]
          );
        }
        return insertResult.rows[0];
    });

    sendSuccess(res, result, null, 201);
  } catch (error) {
    if (error.message === 'Invalid role') {
        return res.status(400).json({ success: false, error: { message: 'Invalid role' } });
    }
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: { message: 'Email already exists' } });
    }
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  const { userId } = req.params;
  const { full_name, email, role_name, team_id, team_ids } = req.body;

  const image_url = req.file ? `/uploads/${req.file.filename}` : null;
  let parsedTeamIds = team_ids;
  if (typeof team_ids === 'string') {
    try { parsedTeamIds = JSON.parse(team_ids); } 
    catch(e) { parsedTeamIds = [team_ids]; }
  }

  try {
    const result = await db.withTransaction(async (client) => {
        // Get role_id
        const roleResult = await client.query('SELECT role_id FROM roles WHERE role_name = $1', [role_name]);
        if (roleResult.rows.length === 0) {
          throw new Error('Invalid role');
        }
        const role_id = roleResult.rows[0].role_id;

        let updateResult;
        if (image_url) {
          updateResult = await client.query(
            `UPDATE users 
             SET full_name = $1, email = $2, role_id = $3, image_url = $4
             WHERE user_id = $5 RETURNING user_id, full_name, email, image_url`,
            [full_name, email, role_id, image_url, userId]
          );
        } else {
          updateResult = await client.query(
            `UPDATE users 
             SET full_name = $1, email = $2, role_id = $3 
             WHERE user_id = $4 RETURNING user_id, full_name, email, image_url`,
            [full_name, email, role_id, userId]
          );
        }

        if (updateResult.rows.length === 0) {
          throw new Error('User not found');
        }

        // Sync team assignment
        await client.query('DELETE FROM team_members WHERE user_id = $1', [userId]);
        if (Array.isArray(parsedTeamIds) && parsedTeamIds.length > 0) {
          for (const tId of parsedTeamIds) {
            if (tId) {
              await client.query(
                'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)',
                [tId, userId]
              );
            }
          }
        } else if (team_id) {
          await client.query(
            'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)',
            [team_id, userId]
          );
        }
        return updateResult.rows[0];
    });

    sendSuccess(res, result, 'User updated successfully');
  } catch (error) {
    if (error.message === 'Invalid role') {
      return res.status(400).json({ success: false, error: { message: 'Invalid role' } });
    }
    if (error.message === 'User not found') {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: { message: 'Email already exists' } });
    }
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  const { userId } = req.params;

  try {
    await db.withTransaction(async (client) => {
        // 1. Remove team memberships
        await client.query('DELETE FROM team_members WHERE user_id = $1', [userId]);

        // 2. Nullify leadership roles in teams
        await client.query('UPDATE teams SET team_lead_id = NULL WHERE team_lead_id = $1', [userId]);
        await client.query('UPDATE teams SET client_handler_id = NULL WHERE client_handler_id = $1', [userId]);

        // 3. Soft delete the user (preventing login and hiding from active lists, but keeping FK references)
        const result = await client.query('UPDATE users SET is_active = false WHERE user_id = $1 RETURNING user_id', [userId]);

        if (result.rows.length === 0) {
          throw new Error('User not found');
        }
    });

    sendSuccess(res, null, 'User deleted successfully');
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
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
  fetchAdminStatsData,
  createUser,
  updateUser,
  deleteUser
};

