require('dotenv').config({ path: './.env' });
const db = require('./src/config/db');

async function fixView() {
  try {
    await db.query('DROP VIEW IF EXISTS v_admin_user_panel;');
    await db.query(`
      CREATE OR REPLACE VIEW v_admin_user_panel AS 
      SELECT u.user_id,
        u.full_name,
        u.email,
        u.image_url,
        r.role_name,
        u.is_active,
        u.created_at,
        COALESCE(json_agg(json_build_object('team_id', t.team_id, 'team_name', t.team_name)) FILTER (WHERE (t.team_id IS NOT NULL)), '[]'::json) AS teams
      FROM (((users u
        JOIN roles r ON ((r.role_id = u.role_id)))
        LEFT JOIN team_members tm ON ((tm.user_id = u.user_id)))
        LEFT JOIN teams t ON ((t.team_id = tm.team_id)))
      WHERE ((r.role_name <> 'Admin') AND (u.is_active = true))
      GROUP BY u.user_id, u.full_name, u.email, u.image_url, r.role_name, u.is_active, u.created_at;
    `);
    console.log('View successfully recreated with image_url!');
  } catch(e) {
    console.error('Error recreating view:', e);
  }
  process.exit();
}

fixView();
