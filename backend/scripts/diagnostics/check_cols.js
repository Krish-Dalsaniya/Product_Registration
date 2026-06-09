const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'products'");
    console.log(JSON.stringify(res.rows.map(r => r.column_name)));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
check();
