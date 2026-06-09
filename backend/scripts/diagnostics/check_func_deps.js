const {pool} = require('./src/config/db');
async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT dependent_view.relname AS view_name
      FROM pg_depend 
      JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
      JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
      JOIN pg_proc ON pg_depend.refobjid = pg_proc.oid 
      WHERE pg_proc.proname = 'get_user_role';
    `);
    console.log("Views depending on get_user_role:", res.rows);
  } catch(e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}
run();
