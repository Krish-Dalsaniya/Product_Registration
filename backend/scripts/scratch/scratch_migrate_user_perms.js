const { pool } = require('./src/config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create user_permissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_permissions (
          user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
          permission_id INT REFERENCES permissions(permission_id) ON DELETE CASCADE,
          granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, permission_id)
      );
    `);
    
    // 2. Remove unused actions and consolidate views
    // We will delete all permissions that end in .export, .publish, .assign
    await client.query(`DELETE FROM role_permissions WHERE permission_id IN (SELECT permission_id FROM permissions WHERE permission_key LIKE '%.export' OR permission_key LIKE '%.publish' OR permission_key LIKE '%.assign')`);
    await client.query(`DELETE FROM permissions WHERE permission_key LIKE '%.export' OR permission_key LIKE '%.publish' OR permission_key LIKE '%.assign'`);

    // We will change .tech_view to .view, and delete .comm_view
    const commViews = await client.query(`SELECT permission_id, permission_key FROM permissions WHERE permission_key LIKE '%.comm_view'`);
    for (let row of commViews.rows) {
      await client.query(`DELETE FROM role_permissions WHERE permission_id = $1`, [row.permission_id]);
      await client.query(`DELETE FROM permissions WHERE permission_id = $1`, [row.permission_id]);
    }
    
    const techViews = await client.query(`SELECT permission_id, permission_key FROM permissions WHERE permission_key LIKE '%.tech_view'`);
    for (let row of techViews.rows) {
      const newKey = row.permission_key.replace('.tech_view', '.view');
      const newDesc = `Allow View on ${newKey.split('.')[0]}`;
      await client.query(`UPDATE permissions SET permission_key = $1, description = $2 WHERE permission_id = $3`, [newKey, newDesc, row.permission_id]);
    }

    // 3. Remove existing products and inventory top-level permissions
    // Wait, first let's see which roles had what, to grant them the new sub-sections.
    const prodAndInvRoles = await client.query(`
      SELECT role_id, permission_key 
      FROM role_permissions rp 
      JOIN permissions p ON rp.permission_id = p.permission_id
      WHERE permission_key LIKE 'products.%' OR permission_key LIKE 'inventory.%'
    `);
    
    // Delete existing products and inventory permissions
    await client.query(`DELETE FROM role_permissions WHERE permission_id IN (SELECT permission_id FROM permissions WHERE permission_key LIKE 'products.%' OR permission_key LIKE 'inventory.%')`);
    await client.query(`DELETE FROM permissions WHERE permission_key LIKE 'products.%' OR permission_key LIKE 'inventory.%'`);

    // 4. Create new sub-section permissions
    const newPerms = [
      'products.general.view', 'products.general.create', 'products.general.edit', 'products.general.delete',
      'products.tech_spec.view', 'products.tech_spec.create', 'products.tech_spec.edit', 'products.tech_spec.delete',
      'products.bom.view', 'products.bom.create', 'products.bom.edit', 'products.bom.delete',
      'products.files.view', 'products.files.create', 'products.files.edit', 'products.files.delete',
      'inventory.general.view', 'inventory.general.create', 'inventory.general.edit', 'inventory.general.delete',
      'inventory.tech_spec.view', 'inventory.tech_spec.create', 'inventory.tech_spec.edit', 'inventory.tech_spec.delete',
      'inventory.files.view', 'inventory.files.create', 'inventory.files.edit', 'inventory.files.delete'
    ];

    const insertedPermIds = {};

    for (let key of newPerms) {
      const parts = key.split('.');
      const desc = `Allow ${parts[2]} on ${parts[0]} (${parts[1]})`;
      const res = await client.query(`INSERT INTO permissions (permission_key, description) VALUES ($1, $2) RETURNING permission_id`, [key, desc]);
      insertedPermIds[key] = res.rows[0].permission_id;
    }

    // 5. Restore role permissions for products and inventory based on what they previously had
    for (let row of prodAndInvRoles.rows) {
      const parts = row.permission_key.split('.'); // e.g. 'products.view'
      const module = parts[0];
      let action = parts[1];
      if (action === 'tech_view' || action === 'comm_view') action = 'view';
      if (action === 'export' || action === 'publish' || action === 'assign') continue;

      const subsections = module === 'products' ? ['general', 'tech_spec', 'bom', 'files'] : ['general', 'tech_spec', 'files'];
      
      for (let sub of subsections) {
        const newKey = `${module}.${sub}.${action}`;
        const permId = insertedPermIds[newKey];
        if (permId) {
          await client.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [row.role_id, permId]);
        }
      }
    }

    await client.query('COMMIT');
    console.log("Migration complete!");
  } catch (e) {
    await client.query('ROLLBACK');
    console.error("Migration failed:", e);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
