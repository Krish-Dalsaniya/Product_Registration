const { pool } = require('./src/config/db');

async function test() {
  try {
    const res = await pool.query("SELECT permission_id, permission_key FROM permissions WHERE permission_key LIKE '%products%'");
    console.log("Permissions:", res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
test();
