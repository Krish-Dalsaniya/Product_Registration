const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://product_registration_user:productregistration45@165.232.191.122:5432/product_registration'
});

async function main() {
  try {
    await pool.query(`DROP VIEW IF EXISTS v_admin_user_panel;`);
    await pool.query(`
      CREATE VIEW v_admin_user_panel AS
       SELECT u.user_id,
          u.full_name,
          u.email,
          u.company,
          u.designation,
          u.image_url,
          r.role_name,
          u.is_active,
          u.created_at,
          COALESCE(json_agg(json_build_object('team_id', t.team_id, 'team_name', t.team_name)) FILTER (WHERE t.team_id IS NOT NULL), '[]'::json) AS teams
         FROM users u
           JOIN roles r ON r.role_id = u.role_id
           LEFT JOIN team_members tm ON tm.user_id = u.user_id
           LEFT JOIN teams t ON t.team_id = tm.team_id
        WHERE r.role_name::text <> 'Admin'::text AND u.is_active = true
        GROUP BY u.user_id, u.full_name, u.email, u.company, u.designation, u.image_url, r.role_name, u.is_active, u.created_at;
    `);
    console.log("View v_admin_user_panel updated successfully!");
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    pool.end();
  }
}

main();
