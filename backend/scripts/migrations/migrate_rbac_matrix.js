const { pool } = require('./src/config/db');

const MODULES = [
  'Dashboard',
  'Customers',
  'Products',
  'Inventory',
  'Sales',
  'Support Tickets',
  'Teams',
  'Users',
  'Roles'
];

const ACTIONS = ['View', 'Create', 'Edit', 'Delete', 'Publish', 'Export', 'Assign'];

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Clear existing permissions and role_permissions to cleanly set up the matrix
    console.log('Clearing old role_permissions and permissions...');
    await client.query('DELETE FROM role_permissions');
    await client.query('DELETE FROM permissions');

    // 2. Insert all permutations into permissions
    console.log('Inserting new permissions matrix...');
    for (const moduleName of MODULES) {
      for (const action of ACTIONS) {
        // e.g. "Products.View" -> key: "products.view"
        const key = `${moduleName.replace(/\s+/g, '').toLowerCase()}.${action.toLowerCase()}`;
        const description = `Allow ${action} on ${moduleName}`;
        
        await client.query(`
          INSERT INTO permissions (permission_key, description, created_at)
          VALUES ($1, $2, NOW())
        `, [key, description]);
      }
    }

    // 3. For Admin (role_id=1), we can either give them all permissions, 
    //    or rely on code to bypass checks. We'll give them all permissions in DB for consistency.
    console.log('Assigning all permissions to Admin...');
    const allPerms = await client.query('SELECT permission_id FROM permissions');
    for (const perm of allPerms.rows) {
      await client.query(`
        INSERT INTO role_permissions (role_id, permission_id, granted_at)
        VALUES (1, $1, NOW())
      `, [perm.permission_id]);
    }

    // Note: We leave Sales, Designer, Maintenance blank to be configured via the new UI,
    // or we could assign some defaults. Let's just assign a few defaults so they aren't completely locked out if not admin.
    // For Sales (role_id=2), maybe Sales.View, Sales.Create, Sales.Edit
    const salesPerms = await client.query(`SELECT permission_id FROM permissions WHERE permission_key LIKE 'sales.%'`);
    for (const perm of salesPerms.rows) {
      await client.query(`
        INSERT INTO role_permissions (role_id, permission_id, granted_at)
        VALUES (2, $1, NOW())
      `, [perm.permission_id]);
    }
    
    // Add Dashboard.View for everyone
    const dashView = await client.query(`SELECT permission_id FROM permissions WHERE permission_key = 'dashboard.view'`);
    if (dashView.rows.length > 0) {
      const pid = dashView.rows[0].permission_id;
      // Assign to Sales(2), Designer(3), Maintenance(4)
      await client.query(`INSERT INTO role_permissions (role_id, permission_id, granted_at) VALUES (2, $1, NOW()) ON CONFLICT DO NOTHING`, [pid]);
      await client.query(`INSERT INTO role_permissions (role_id, permission_id, granted_at) VALUES (3, $1, NOW()) ON CONFLICT DO NOTHING`, [pid]);
      await client.query(`INSERT INTO role_permissions (role_id, permission_id, granted_at) VALUES (4, $1, NOW()) ON CONFLICT DO NOTHING`, [pid]);
    }

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
