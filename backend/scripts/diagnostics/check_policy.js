const {pool} = require('./src/config/db');
async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT polname, pg_get_expr(polqual, polrelid) as qual
      FROM pg_policy
      WHERE polname = 'pol_users_admin'
    `);
    console.log(res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}
run();
