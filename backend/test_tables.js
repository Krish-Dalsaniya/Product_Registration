const { pool } = require('./src/config/db');
(async () => {
  try {
    const res = await pool.query("SELECT table_name, table_type FROM information_schema.tables WHERE table_name IN ('forms', 'enterprise_forms')");
    console.log(res.rows);
  } catch (err) {
    console.error(err.message);
  } finally {
    pool.end();
  }
})();
