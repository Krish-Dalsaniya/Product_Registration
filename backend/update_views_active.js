const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const updateViews = async () => {
  try {
    console.log('Updating views to filter out inactive users...');
    
    // 1. Update v_admin_user_panel
    await pool.query(`
      CREATE OR REPLACE VIEW v_admin_user_panel AS
      SELECT
          u.user_id,
          u.full_name,
          u.email,
          r.role_name,
          u.is_active,
          u.created_at
      FROM users u
      JOIN roles r ON r.role_id = u.role_id
      WHERE r.role_name <> 'Admin' AND u.is_active = TRUE;
    `);

    // 2. Update v_designer_project_overview
    await pool.query(`
      CREATE OR REPLACE VIEW v_designer_project_overview AS
      SELECT
          u.user_id         AS designer_user_id,
          u.full_name       AS designer_name,
          dp.specialty,
          dp.availability,
          t.team_name,
          p.project_name,
          p.status          AS project_status,
          pr.product_name,
          pr.product_code,
          djp.role_in_project,
          djp.assigned_at
      FROM designer_projects djp
      JOIN designer_profiles dp  ON dp.designer_id = djp.designer_id
      JOIN users             u   ON u.user_id       = dp.designer_id
      JOIN projects          p   ON p.project_id    = djp.project_id
      LEFT JOIN team_members tm  ON tm.user_id      = dp.designer_id
      LEFT JOIN teams        t   ON t.team_id       = tm.team_id
      LEFT JOIN products     pr  ON pr.product_id   = p.product_id
      WHERE p.status = 'Active' AND u.is_active = TRUE;
    `);

    // 3. Update v_sales_product_overview
    await pool.query(`
      CREATE OR REPLACE VIEW v_sales_product_overview AS
      SELECT
          u.user_id     AS sales_user_id,
          u.full_name   AS sales_name,
          sp.region,
          sp.target_revenue,
          pr.product_name,
          pr.product_code,
          spr.is_primary,
          spr.assigned_at
      FROM sales_products spr
      JOIN sales_profiles sp ON sp.sales_id   = spr.sales_id
      JOIN users          u  ON u.user_id     = sp.sales_id
      JOIN products       pr ON pr.product_id = spr.product_id
      WHERE pr.is_active = TRUE AND u.is_active = TRUE;
    `);

    // 4. Update v_maintenance_overview
    await pool.query(`
      CREATE OR REPLACE VIEW v_maintenance_overview AS
      SELECT
          u.user_id             AS staff_user_id,
          u.full_name           AS staff_name,
          mp.certification,
          pr.product_name,
          pr.product_code,
          mr.record_title,
          mr.scheduled_date,
          mt.task_title,
          mt.priority,
          mt.status             AS task_status,
          mt.due_date,
          mt.completed_at
      FROM maintenance_tasks mt
      JOIN maintenance_profiles mp  ON mp.maintenance_id = mt.maintenance_id
      JOIN users                u   ON u.user_id          = mp.maintenance_id
      JOIN maintenance_records  mr  ON mr.record_id        = mt.record_id
      JOIN products             pr  ON pr.product_id       = mr.product_id
      WHERE u.is_active = TRUE
      ORDER BY mt.priority DESC, mt.due_date;
    `);

    // 5. Update v_team_project_summary to filter inactive members
    await pool.query(`
      CREATE OR REPLACE VIEW v_team_project_summary AS
      SELECT
          t.team_id,
          t.team_name,
          r.role_id,
          r.role_name,
          STRING_AGG(DISTINCT u.full_name, ', ') AS member_names,
          COUNT(DISTINCT tm.user_id)  AS member_count,
          COUNT(DISTINCT p.project_id)    AS total_projects,
          COUNT(DISTINCT p.project_id)
              FILTER (WHERE p.status = 'Active')      AS active_projects,
          STRING_AGG(DISTINCT p.project_name, ', ')
              FILTER (WHERE p.status = 'Active')      AS active_project_names,
          STRING_AGG(DISTINCT pr.product_name, ', ')  AS linked_products
      FROM teams t
      LEFT JOIN roles r ON t.role_id = r.role_id
      LEFT JOIN team_members    tm ON tm.team_id    = t.team_id
      LEFT JOIN users           u  ON u.user_id     = tm.user_id AND u.is_active = TRUE
      LEFT JOIN projects        p  ON p.team_id     = t.team_id
      LEFT JOIN products        pr ON pr.product_id = p.product_id
      GROUP BY t.team_id, t.team_name, r.role_id, r.role_name;
    `);

    console.log('Views updated successfully!');
  } catch (err) {
    console.error('Error updating views:', err);
  } finally {
    await pool.end();
  }
};

updateViews();
