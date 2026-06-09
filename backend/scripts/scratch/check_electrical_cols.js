const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
  try {
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'electrical_tech_spec'");
    console.log('Columns in electrical_tech_spec:', JSON.stringify(res.rows.map(r => r.column_name)));
    
    const masterRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'electrical_part_master'");
    console.log('Columns in electrical_part_master:', JSON.stringify(masterRes.rows.map(r => r.column_name)));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
check();
