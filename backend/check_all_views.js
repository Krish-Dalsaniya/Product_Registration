const {pool} = require('./src/config/db');
async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT dependent_view.relname AS view_name
      FROM pg_depend 
      JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
      JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
      JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid 
      JOIN pg_attribute ON pg_depend.refobjid = pg_attribute.attrelid 
        AND pg_depend.refobjsubid = pg_attribute.attnum 
      WHERE source_table.relname = 'roles' AND pg_attribute.attname = 'role_name'
      GROUP BY dependent_view.relname;
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
