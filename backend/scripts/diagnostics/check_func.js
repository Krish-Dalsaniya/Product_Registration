const {pool} = require('./src/config/db');
async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT pg_get_functiondef(oid)
      FROM pg_proc
      WHERE proname = 'get_user_role'
    `);
    console.log(res.rows[0].pg_get_functiondef);
  } catch(e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}
run();
