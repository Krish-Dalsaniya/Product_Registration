const db = require('../../config/db');
const { sendSuccess } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');
const crypto = require('crypto');
const env = require('../../config/env');
const { logAudit } = require('../../utils/audit');
const { sendEmail } = require('../../utils/email');

const getUsers = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req);
  const { role, company } = req.query;

  try {
    // Use DISTINCT ON to prevent duplicate rows caused by users belonging to multiple teams
    let queryText = `
      WITH user_panel AS (
        SELECT u.user_id,
            u.full_name,
            u.email,
            u.company,
            u.designation,
            u.image_url,
            r.role_name,
            u.is_active,
            u.created_at,
            COALESCE(um.mobile_number, '') AS mobile_number,
            COALESCE(json_agg(json_build_object('team_id', t.team_id, 'team_name', t.team_name)) FILTER (WHERE t.team_id IS NOT NULL), '[]'::json) AS teams
          FROM users u
            JOIN roles r ON r.role_id = u.role_id
            LEFT JOIN team_members tm ON tm.user_id = u.user_id
            LEFT JOIN teams t ON t.team_id = tm.team_id
            LEFT JOIN user_mobile um ON um.user_id = u.user_id
          WHERE u.is_active = true
          GROUP BY u.user_id, u.full_name, u.email, u.company, u.designation, u.image_url, r.role_name, u.is_active, u.created_at, um.mobile_number
      )
      SELECT DISTINCT ON (v.user_id) v.*, COALESCE(uca.has_custom_permissions, false) as has_custom_permissions, COUNT(*) OVER() as total_count
      FROM user_panel v
      LEFT JOIN user_custom_access uca ON v.user_id = uca.user_id
      WHERE 1=1
    `;
    const params = [limit, offset];

    if (role) {
      params.push(role);
      queryText += ` AND role_name::text = $${params.length}`;
    }
    
    if (company) {
      params.push(company);
      queryText += ` AND company::text = $${params.length}`;
    }

    queryText += ` ORDER BY v.user_id, v.created_at DESC LIMIT $1 OFFSET $2`;

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
      `WITH user_panel AS (
        SELECT u.user_id,
            u.full_name,
            u.email,
            u.company,
            u.designation,
            u.image_url,
            r.role_name,
            u.is_active,
            u.created_at,
            COALESCE(um.mobile_number, '') AS mobile_number,
            COALESCE(json_agg(json_build_object('team_id', t.team_id, 'team_name', t.team_name)) FILTER (WHERE t.team_id IS NOT NULL), '[]'::json) AS teams
          FROM users u
            JOIN roles r ON r.role_id = u.role_id
            LEFT JOIN team_members tm ON tm.user_id = u.user_id
            LEFT JOIN teams t ON t.team_id = tm.team_id
            LEFT JOIN user_mobile um ON um.user_id = u.user_id
          WHERE u.is_active = true
          GROUP BY u.user_id, u.full_name, u.email, u.company, u.designation, u.image_url, r.role_name, u.is_active, u.created_at, um.mobile_number
       )
       SELECT v.*, COALESCE(uca.has_custom_permissions, false) as has_custom_permissions 
       FROM user_panel v 
       LEFT JOIN user_custom_access uca ON v.user_id = uca.user_id 
       WHERE v.user_id = $1`,
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
  const { role, module } = req.query;
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
        ) as member_ids,
        COALESCE(tmod.module, 'Admin') as module
      FROM v_team_project_summary v
      JOIN teams t ON t.team_id = v.team_id
      LEFT JOIN team_modules tmod ON tmod.team_id = t.team_id
    `;
    const params = [];
    const conditions = [];
    
    if (role && role !== 'All') {
      params.push(role);
      conditions.push(`v.role_name::text = $${params.length}`);
    }
    
    if (module) {
      params.push(module);
      conditions.push(`COALESCE(tmod.module, 'Admin') = $${params.length}`);
    }
    
    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
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
      (SELECT COUNT(*) FROM finished_goods) as finished_goods_count,
      (SELECT COALESCE(SUM(quantity), 0) FROM finished_goods) as finished_goods_qty,
      (SELECT COUNT(*) FROM book_a_sale) as book_a_sale_count,
      (SELECT COALESCE(SUM(quantity), 0) FROM book_a_sale) as book_a_sale_qty,
      (SELECT COUNT(*) FROM support_tickets) as support_tickets_total,
      (SELECT COUNT(*) FROM support_tickets WHERE status IN ('Pending', 'In Progress')) as support_tickets_active
  `;



  const result = await db.query(queryText);
  const row = result.rows[0];

  // Fetch designations distribution
  const destQuery = `
    SELECT r.role_name as department, COALESCE(u.designation, 'Unassigned') as designation, COUNT(u.user_id)::int as count 
    FROM users u 
    JOIN roles r ON u.role_id = r.role_id 
    WHERE u.is_active = TRUE 
    GROUP BY r.role_name, COALESCE(u.designation, 'Unassigned');
  `;
  const destResult = await db.query(destQuery);


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

    finishedGoodsCount: parseInt(row.finished_goods_count),
    finishedGoodsQty: parseInt(row.finished_goods_qty),
    bookASaleCount: parseInt(row.book_a_sale_count),
    bookASaleQty: parseInt(row.book_a_sale_qty),
    supportTicketsTotal: parseInt(row.support_tickets_total),
    supportTicketsActive: parseInt(row.support_tickets_active),
    designationsDistribution: destResult.rows,
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
const cloudinary = require('../../config/cloudinary');
const fs = require('fs');
const path = require('path');

const createUser = async (req, res, next) => {
  const { full_name, email, password, role_name, team_id, team_ids, company, designation, mobile_number } = req.body;

  let image_url = null;
  if (req.file) {
    try {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'users/avatars',
        resource_type: 'image',
      });
      image_url = result.secure_url;
      // Delete local file
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch (error) {
      console.error("Cloudinary upload failed:", error);
      return res.status(500).json({ success: false, error: { message: 'Image upload failed. Please try again.' } });
    }
  }
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
          `INSERT INTO users (full_name, email, password_hash, role_id, image_url, company, designation) 
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING user_id, full_name, email, image_url, company, designation`,
          [full_name, email, password_hash, role_id, image_url, company, designation]
        );

        // Create profile based on role
        const userId = insertResult.rows[0].user_id;
        
        // Force password change on first login
        await client.query('INSERT INTO user_password_reset (user_id, requires_password_change) VALUES ($1, true)', [userId]);
        if (role_name === 'Designer') {
          await client.query('INSERT INTO designer_profiles (designer_id) VALUES ($1)', [userId]);
        } else if (role_name === 'Sales') {
          await client.query('INSERT INTO sales_profiles (sales_id) VALUES ($1)', [userId]);
        } else if (role_name === 'Maintenance') {
          await client.query('INSERT INTO maintenance_profiles (maintenance_id) VALUES ($1)', [userId]);
        }
        
        if (mobile_number) {
          await client.query('INSERT INTO user_mobile (user_id, mobile_number) VALUES ($1, $2)', [userId, mobile_number]);
        }

        // Auto-create HR employee record
        const countRes = await client.query('SELECT COUNT(*) FROM hr_employees');
        let nextNum = parseInt(countRes.rows[0].count) + 1;
        let empCode = `EMP-${nextNum.toString().padStart(3, '0')}`;
        let isUnique = false;
        
        while (!isUnique) {
          const checkRes = await client.query('SELECT 1 FROM hr_employees WHERE emp_code = $1', [empCode]);
          if (checkRes.rows.length === 0) {
            isUnique = true;
          } else {
            nextNum++;
            empCode = `EMP-${nextNum.toString().padStart(3, '0')}`;
          }
        }
        const employeeResult = await client.query(
          `INSERT INTO hr_employees (user_id, emp_code, date_of_joining, employment_status)
           VALUES ($1, $2, CURRENT_DATE, 'Full-Time') RETURNING employee_id`,
          [userId, empCode]
        );
        const employee_id = employeeResult.rows[0].employee_id;

        // Also add them to the onboarding kanban
        await client.query(
          `INSERT INTO hr_onboarding (employee_id, status) VALUES ($1, 'Pending')`,
          [employee_id]
        );

        // Email Verification Token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        
        await client.query(
          'INSERT INTO email_verification_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
          [tokenHash, userId, expiresAt]
        );
        
        // Also insert into user_email_verified
        await client.query(
          'INSERT INTO user_email_verified (user_id, is_verified) VALUES ($1, false) ON CONFLICT (user_id) DO NOTHING',
          [userId]
        );

        // Send Email
        const frontendUrl = env.FRONTEND_URL;
        const loginLink = `${frontendUrl}/login`;
        
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Welcome to Leon's Group Product Registration!</h2>
            <p>Hello ${full_name},</p>
            <p>An administrator has created an account for you.</p>
            <p><strong>Your email:</strong> ${email}</p>
            <p><strong>Your temporary password is:</strong> ${password}</p>
            <p>Please log in using these credentials. You will be asked to set a permanent password upon your first login.</p>
            <a href="${loginLink}" style="display: inline-block; padding: 10px 20px; background-color: #ff7944; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">Log In to Your Account</a>
          </div>
        `;
        
        // Don't wait for email to send, run in background to prevent blocking
        sendEmail({
          to: email,
          subject: 'Welcome to Leon\'s Group - Your Account Details',
          html: emailHtml
        }).catch(err => console.error('Failed to send welcome email:', err));

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

    await logAudit({ userId: req.user ? req.user.user_id : null, action: 'CREATE_USER', entityType: 'USER', entityId: result.user_id, description: `Created new user: ${result.email}`, newValue: result, ipAddress: req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || req.ip });
    sendSuccess(res, result, null, 201);
  } catch (error) {
    if (error.message === 'Invalid role') {
        return res.status(400).json({ success: false, error: { message: 'Invalid role' } });
    }
    if (error.code === '23505') {
      if (error.constraint === 'users_email_key') {
        return res.status(400).json({ success: false, error: { message: 'Email already exists' } });
      }
      return res.status(400).json({ success: false, error: { message: 'A unique constraint was violated' } });
    }
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  const { userId } = req.params;
  const { full_name, email, role_name, team_id, team_ids, company, designation, mobile_number } = req.body;

  let image_url = null;
  if (req.file) {
    try {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'users/avatars',
        resource_type: 'image',
      });
      image_url = result.secure_url;
      // Delete local file
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    } catch (error) {
      console.error("Cloudinary upload failed:", error);
      return res.status(500).json({ success: false, error: { message: 'Image upload failed. Please try again.' } });
    }
  }
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

        // Fetch old image to delete later if needed
        const currentUser = await client.query('SELECT user_id, full_name, email, image_url, company, designation, role_id FROM users WHERE user_id = $1', [userId]);
        const oldUserRecord = currentUser.rows.length > 0 ? currentUser.rows[0] : null;
        const oldImageUrl = oldUserRecord ? oldUserRecord.image_url : null;

        let updateResult;
        if (image_url) {
          updateResult = await client.query(
            `UPDATE users 
             SET full_name = $1, email = $2, role_id = $3, image_url = $4, company = $5, designation = $7
             WHERE user_id = $6 RETURNING user_id, full_name, email, image_url, company, designation`,
            [full_name, email, role_id, image_url, company, userId, designation]
          );
        } else {
          updateResult = await client.query(
            `UPDATE users 
             SET full_name = $1, email = $2, role_id = $3, company = $4, designation = $6
             WHERE user_id = $5 RETURNING user_id, full_name, email, image_url, company, designation`,
            [full_name, email, role_id, company, userId, designation]
          );
        }

        if (updateResult.rows.length === 0) {
          throw new Error('User not found');
        }

        if (mobile_number !== undefined) {
          await client.query(`
            INSERT INTO user_mobile (user_id, mobile_number) 
            VALUES ($1, $2)
            ON CONFLICT (user_id) DO UPDATE SET mobile_number = EXCLUDED.mobile_number
          `, [userId, mobile_number]);
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
        
        return { user: updateResult.rows[0], oldImageUrl, oldUserRecord };
    });

    // Cleanup old image from Cloudinary or local
    if (image_url && result.oldImageUrl) {
      if (result.oldImageUrl.includes('cloudinary.com')) {
        try {
          const parts = result.oldImageUrl.split('/');
          const lastPart = parts[parts.length - 1];
          const folderParts = parts.slice(parts.indexOf('upload') + 2, parts.length - 1);
          const publicIdWithExt = [...folderParts, lastPart].join('/');
          const publicId = publicIdWithExt.split('.')[0];
          await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        } catch (e) {
          console.error('Failed to delete old Cloudinary image:', e);
        }
      } else {
        const filePath = path.join(__dirname, '../../', result.oldImageUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }

    await logAudit({ userId: req.user ? req.user.user_id : null, action: 'UPDATE_USER', entityType: 'USER', entityId: userId, description: `Updated user profile for: ${result.user.email}`, oldValue: result.oldUserRecord, newValue: result.user, ipAddress: req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || req.ip });
    sendSuccess(res, result.user, 'User updated successfully');
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

    await logAudit({ userId: req.user ? req.user.user_id : null, action: 'DELETE_USER', entityType: 'USER', entityId: userId, description: `Deleted user ID: ${userId}`, ipAddress: req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || req.ip });
    sendSuccess(res, null, 'User deleted successfully');
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }
    next(error);
  }
};

const removeUserImage = async (req, res, next) => {
  const { userId } = req.params;
  try {
    const user = await db.query('SELECT image_url FROM users WHERE user_id = $1', [userId]);
    if (user.rows.length === 0) return res.status(404).json({ success: false, error: { message: 'User not found' } });
    
    const imageUrl = user.rows[0].image_url;
    if (imageUrl) {
      if (imageUrl.includes('cloudinary.com')) {
        try {
          const parts = imageUrl.split('/');
          const lastPart = parts[parts.length - 1];
          const folderParts = parts.slice(parts.indexOf('upload') + 2, parts.length - 1);
          const publicIdWithExt = [...folderParts, lastPart].join('/');
          const publicId = publicIdWithExt.split('.')[0];
          await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        } catch (e) {
          console.error('Failed to delete Cloudinary image:', e);
        }
      } else {
        const filePath = path.join(__dirname, '../../', imageUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      
      await db.query('UPDATE users SET image_url = NULL WHERE user_id = $1', [userId]);
    }
    
    sendSuccess(res, null, 'Image removed successfully');
  } catch (error) {
    next(error);
  }
};

const resetUser2FA = async (req, res, next) => {
  const { userId } = req.params;
  try {
    const result = await db.query('DELETE FROM user_two_factor WHERE user_id = $1 RETURNING user_id', [userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, error: { message: '2FA configuration not found for this user.' } });
    }
    sendSuccess(res, null, 'User 2FA configuration reset successfully.');
  } catch (error) {
    next(error);
  }
};

const resetUserPassword = async (req, res, next) => {
  const { userId } = req.params;
  try {
    const userResult = await db.query('SELECT full_name, email FROM users WHERE user_id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }
    const user = userResult.rows[0];
    
    // Generate an 8-character random password
    const tempPassword = crypto.randomBytes(4).toString('hex');
    const password_hash = await bcrypt.hash(tempPassword, 10);

    await db.withTransaction(async (client) => {
      await client.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [password_hash, userId]);
      await client.query(
        'INSERT INTO user_password_reset (user_id, requires_password_change) VALUES ($1, true) ON CONFLICT (user_id) DO UPDATE SET requires_password_change = true',
        [userId]
      );
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Password Reset</h2>
        <p>Hello ${user.full_name},</p>
        <p>An administrator has reset your password.</p>
        <p><strong>Your new temporary password is:</strong> ${tempPassword}</p>
        <p>Please log in using this password. You will be asked to set a permanent password upon your first login.</p>
        <a href="${env.FRONTEND_URL}/login" style="display: inline-block; padding: 10px 20px; background-color: #ff7944; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">Log In to Your Account</a>
      </div>
    `;

    sendEmail({
      to: user.email,
      subject: 'Password Reset - Your New Temporary Password',
      html: emailHtml
    }).catch(err => console.error('Failed to send reset password email:', err));

    sendSuccess(res, { tempPassword }, 'User password reset successfully.');
  } catch (error) {
    next(error);
  }
};

const getUserPermissions = async (req, res, next) => {
  const { userId } = req.params;
  try {
    let permissions = [];
    try {
      const result = await db.query(`
        SELECT p.permission_id, p.permission_key 
        FROM permissions p
        JOIN user_permissions up ON p.permission_id = up.permission_id
        WHERE up.user_id = $1
      `, [userId]);
      permissions = result.rows.map(r => r.permission_key);
    } catch (err) {
      if (err.code !== '42P01') throw err; // 42P01 is undefined_table
    }
    
    // Also fetch user to know if they have custom permissions enabled
    let hasCustom = false;
    try {
      const userRes = await db.query('SELECT has_custom_permissions FROM user_custom_access WHERE user_id = $1', [userId]);
      hasCustom = userRes.rows[0]?.has_custom_permissions || false;
    } catch (err) {
      if (err.code !== '42P01') throw err; // 42P01 is undefined_table
    }

    sendSuccess(res, { permissions, has_custom_permissions: hasCustom });
  } catch (error) {
    next(error);
  }
};

const updateUserPermissions = async (req, res, next) => {
  const { userId } = req.params;
  const { permissions, has_custom_permissions } = req.body; // permissions is an array of permission_id

  try {
    await db.withTransaction(async (client) => {
      try {
        await client.query(`
          INSERT INTO user_custom_access (user_id, has_custom_permissions) 
          VALUES ($2, $1)
          ON CONFLICT (user_id) DO UPDATE SET has_custom_permissions = EXCLUDED.has_custom_permissions
        `, [has_custom_permissions, userId]);
      } catch (err) {
        if (err.code !== '42P01') throw err;
        throw new Error('Database migration pending. Please run the migration script to add user_custom_access table.');
      }
      
      try {
        await client.query('DELETE FROM user_permissions WHERE user_id = $1', [userId]);
        
        if (has_custom_permissions && Array.isArray(permissions) && permissions.length > 0) {
          console.log('INSERTING PERMISSIONS:', permissions);
          const values = permissions.map((p, i) => `($1, $${i + 2})`).join(', ');
          const queryParams = [userId, ...permissions];
          await client.query(
            `INSERT INTO user_permissions (user_id, permission_id) VALUES ${values}`,
            queryParams
          );
        }
      } catch (err) {
        if (err.code !== '42P01') throw err;
        throw new Error('Database migration pending. Please run the migration script to add user_permissions table.');
      }
    });

    // Clear Redis cache for this user
    const { redisClient } = require('../../config/redis');
    if (redisClient && redisClient.isReady) {
      await redisClient.del(`user_custom_perms:${userId}`);
    }

    sendSuccess(res, null, 'User permissions updated successfully');
  } catch (error) {
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
  deleteUser,
  removeUserImage,
  resetUser2FA,
  resetUserPassword,
  getUserPermissions,
  updateUserPermissions
};
