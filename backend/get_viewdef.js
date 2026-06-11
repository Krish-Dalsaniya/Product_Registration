const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://product_registration_user:productregistration45@165.232.191.122:5432/product_registration'
});

async function main() {
  try {
    const res = await pool.query(`SELECT pg_get_viewdef('v_admin_user_panel', true) as viewdef;`);
    console.log(res.rows[0].viewdef);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    pool.end();
  }
}

main();
