const {pool} = require('./src/config/db');
async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT definition
      FROM pg_views
      WHERE viewname = 'v_admin_user_panel'
    `);
    console.log(res.rows[0].definition);
  } catch(e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}
run();
