const {pool} = require('./src/config/db');
async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Drop the policy
    await client.query('DROP POLICY IF EXISTS pol_users_admin ON users');
    console.log('Dropped policy');

    // 2. Drop views
    await client.query('DROP VIEW IF EXISTS v_admin_user_panel');
    await client.query('DROP VIEW IF EXISTS v_team_project_summary');
    console.log('Dropped views');

    // 3. Drop function get_user_role
    await client.query('DROP FUNCTION IF EXISTS get_user_role(uuid) CASCADE');
    console.log('Dropped function get_user_role');

    // 4. Alter the column
    await client.query('ALTER TABLE roles ALTER COLUMN role_name TYPE VARCHAR(50) USING role_name::varchar;');
    console.log('Altered column');

    // 5. Drop the ENUM type
    await client.query('DROP TYPE IF EXISTS user_role');
    console.log('Dropped ENUM type');

    // 6. Recreate the policy without enum cast
    await client.query(`
      CREATE POLICY pol_users_admin ON users
      FOR ALL
      USING (
        current_setting('app.current_role', true) = 'Admin' 
        AND role_id <> (SELECT role_id FROM roles WHERE role_name = 'Admin')
      );
    `);
    console.log('Recreated policy');

    // 7. Recreate v_admin_user_panel without enum cast
    await client.query(`
      CREATE VIEW v_admin_user_panel AS
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

    // 8. Recreate v_team_project_summary
    await client.query(`
      CREATE VIEW v_team_project_summary AS
      SELECT t.team_id,
        t.team_name,
        r.role_id,
        r.role_name,
        string_agg(DISTINCT (u.full_name)::text, ', '::text) AS member_names,
        count(DISTINCT tm.user_id) AS member_count,
        count(DISTINCT p.project_id) AS total_projects,
        count(DISTINCT p.project_id) FILTER (WHERE (p.status = 'Active'::project_status)) AS active_projects,
        string_agg(DISTINCT (p.project_name)::text, ', '::text) FILTER (WHERE (p.status = 'Active'::project_status)) AS active_project_names,
        string_agg(DISTINCT (pr.product_name)::text, ', '::text) AS linked_products
      FROM (((((teams t
        LEFT JOIN roles r ON ((t.role_id = r.role_id)))
        LEFT JOIN team_members tm ON ((tm.team_id = t.team_id)))
        LEFT JOIN users u ON (((u.user_id = tm.user_id) AND (u.is_active = true))))
        LEFT JOIN projects p ON ((p.team_id = t.team_id)))
        LEFT JOIN products pr ON ((pr.product_id = p.product_id)))
      GROUP BY t.team_id, t.team_name, r.role_id, r.role_name;
    `);
    console.log('Recreated views');

    // 9. Recreate get_user_role returning VARCHAR
    await client.query(`
      CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
      RETURNS varchar
      LANGUAGE sql
      STABLE
      AS $$
        SELECT r.role_name::varchar
        FROM users u
        JOIN roles r ON r.role_id = u.role_id
        WHERE u.user_id = p_user_id
          AND u.is_active = TRUE;
      $$;
    `);
    console.log('Recreated get_user_role function');

    await client.query('COMMIT');
    console.log('Migration successful');
  } catch(e) {
    console.error(e);
    await client.query('ROLLBACK');
  } finally {
    client.release();
    pool.end();
  }
}
run();
