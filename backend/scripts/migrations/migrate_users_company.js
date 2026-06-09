const { pool } = require('./src/config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Add company column
    console.log('Adding company column to users table...');
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS company VARCHAR(255);
    `);

    // 2. Update v_admin_user_panel view
    console.log('Updating v_admin_user_panel view...');
    await client.query(`DROP VIEW IF EXISTS v_admin_user_panel;`);
    await client.query(`
      CREATE VIEW v_admin_user_panel AS
      SELECT u.user_id,
        u.full_name,
        u.email,
        u.company,
        u.image_url,
        r.role_name,
        u.is_active,
        u.created_at,
        COALESCE(json_agg(json_build_object('team_id', t.team_id, 'team_name', t.team_name)) FILTER (WHERE (t.team_id IS NOT NULL)), '[]'::json) AS teams
      FROM (((users u
        JOIN roles r ON ((r.role_id = u.role_id)))
        LEFT JOIN team_members tm ON ((tm.user_id = u.user_id)))
        LEFT JOIN teams t ON ((t.team_id = tm.team_id)))
      WHERE (((r.role_name)::text <> 'Admin'::text) AND (u.is_active = true))
      GROUP BY u.user_id, u.full_name, u.email, u.company, u.image_url, r.role_name, u.is_active, u.created_at;
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
