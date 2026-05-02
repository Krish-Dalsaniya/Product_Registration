const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function check() {
  try {
    const res = await pool.query("SELECT pg_get_viewdef('v_team_project_summary')");
    console.log(res.rows[0].pg_get_viewdef);
    
    const res2 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'v_team_project_summary'");
    console.log('View Columns:', res2.rows.map(r => r.column_name).join(', '));

    const res3 = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'teams'");
    console.log('Table Columns:', res3.rows.map(r => r.column_name).join(', '));
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
check();
