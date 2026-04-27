const { pool } = require('./src/config/db');

const updateViews = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Drop existing views to allow column changes
    await client.query('DROP VIEW IF EXISTS v_team_project_summary CASCADE');
    await client.query('DROP VIEW IF EXISTS v_designer_project_overview CASCADE');
    
    // Update v_team_project_summary
    await client.query(`
      CREATE OR REPLACE VIEW v_team_project_summary AS
      SELECT
          t.team_id,
          t.team_name,
          t.role_id,
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
      LEFT JOIN roles r ON r.role_id = t.role_id
      LEFT JOIN team_members tm ON tm.team_id = t.team_id
      LEFT JOIN users u ON u.user_id = tm.user_id
      LEFT JOIN projects p ON p.team_id = t.team_id
      LEFT JOIN products pr ON pr.product_id = p.product_id
      GROUP BY t.team_id, t.team_name, t.role_id, r.role_name;
    `);

    // Update v_designer_project_overview if it exists and uses designer_id
    await client.query(`
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
      LEFT JOIN team_members tm  ON tm.user_id  = u.user_id
      LEFT JOIN teams        t   ON t.team_id       = tm.team_id
      LEFT JOIN products     pr  ON pr.product_id   = p.product_id
      WHERE p.status = 'Active';
    `);

    await client.query('COMMIT');
    console.log('Views updated successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to update views:', error);
  } finally {
    client.release();
    process.exit();
  }
};

updateViews();
