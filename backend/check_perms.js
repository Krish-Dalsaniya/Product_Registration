const { pool } = require('./src/config/db');

async function check() {
  const res = await pool.query("SELECT permission_key FROM permissions WHERE permission_key LIKE 'products.%' OR permission_key LIKE 'inventory.%'");
  console.log(res.rows);
  process.exit(0);
}
check();
