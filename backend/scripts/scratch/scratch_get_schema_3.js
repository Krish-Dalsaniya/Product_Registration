const { pool } = require('./src/config/db');

async function main() {
  const result = await pool.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('users', 'roles', 'permissions', 'role_permissions', 'user_permissions')
    ORDER BY table_name, ordinal_position;
  `);
  console.table(result.rows);
  
  const perms = await pool.query('SELECT permission_key, description FROM permissions ORDER BY permission_key;');
  console.log("All Permissions:", perms.rows);

  process.exit(0);
}

main().catch(console.error);
