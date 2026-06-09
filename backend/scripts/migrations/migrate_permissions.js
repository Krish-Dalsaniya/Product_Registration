const { pool } = require('./src/config/db');

async function migratePermissions() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Get all '.view' permissions
    const viewPermsResult = await client.query(`
      SELECT permission_id, permission_key, description 
      FROM permissions 
      WHERE permission_key LIKE '%.view'
    `);
    
    const viewPerms = viewPermsResult.rows;

    for (const perm of viewPerms) {
      const modulePrefix = perm.permission_key.split('.')[0];
      
      // Check if .tech_view and .comm_view already exist
      let techViewId, commViewId;

      const existingTech = await client.query('SELECT permission_id FROM permissions WHERE permission_key = $1', [`${modulePrefix}.tech_view`]);
      if (existingTech.rows.length > 0) {
        techViewId = existingTech.rows[0].permission_id;
      } else {
        const insertTech = await client.query(
          'INSERT INTO permissions (permission_key, description) VALUES ($1, $2) RETURNING permission_id',
          [`${modulePrefix}.tech_view`, `Allow Technical View on ${modulePrefix.charAt(0).toUpperCase() + modulePrefix.slice(1)}`]
        );
        techViewId = insertTech.rows[0].permission_id;
      }

      const existingComm = await client.query('SELECT permission_id FROM permissions WHERE permission_key = $1', [`${modulePrefix}.comm_view`]);
      if (existingComm.rows.length > 0) {
        commViewId = existingComm.rows[0].permission_id;
      } else {
        const insertComm = await client.query(
          'INSERT INTO permissions (permission_key, description) VALUES ($1, $2) RETURNING permission_id',
          [`${modulePrefix}.comm_view`, `Allow Commercial View on ${modulePrefix.charAt(0).toUpperCase() + modulePrefix.slice(1)}`]
        );
        commViewId = insertComm.rows[0].permission_id;
      }

      // 2. Find roles that have the old .view permission
      const rolePerms = await client.query(
        'SELECT role_id FROM role_permissions WHERE permission_id = $1',
        [perm.permission_id]
      );

      // 3. Grant new permissions to those roles
      for (const rolePerm of rolePerms.rows) {
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [rolePerm.role_id, techViewId]
        );
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [rolePerm.role_id, commViewId]
        );
      }

      // 4. Delete the old .view permission mappings and the permission itself
      await client.query('DELETE FROM role_permissions WHERE permission_id = $1', [perm.permission_id]);
      await client.query('DELETE FROM permissions WHERE permission_id = $1', [perm.permission_id]);

      console.log(`Migrated ${perm.permission_key} to tech_view and comm_view.`);
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

migratePermissions();
