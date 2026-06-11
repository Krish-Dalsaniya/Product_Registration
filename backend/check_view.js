const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://product_registration_user:productregistration45@165.232.191.122:5432/product_registration'
});

async function checkView() {
  try {
    const res = await pool.query('SELECT * FROM v_admin_user_panel LIMIT 1;');
    console.log('Columns in view:', Object.keys(res.rows[0] || {}));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    pool.end();
  }
}

checkView();
