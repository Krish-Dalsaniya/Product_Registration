const { pool } = require('./src/config/db');

async function run() {
  const result = await pool.query(`SELECT * FROM permissions LIMIT 10`);
  console.log('Permissions:', JSON.stringify(result.rows, null, 2));

  const roleResult = await pool.query(`SELECT * FROM roles LIMIT 10`);
  console.log('Roles:', JSON.stringify(roleResult.rows, null, 2));
  
  process.exit();
}
run();
