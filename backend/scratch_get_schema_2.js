const { pool } = require('./src/config/db');

async function run() {
  const result = await pool.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name IN ('users', 'roles', 'permissions', 'role_permissions')
    ORDER BY table_name, ordinal_position;
  `);
  console.log(JSON.stringify(result.rows, null, 2));
  process.exit();
}
run();
