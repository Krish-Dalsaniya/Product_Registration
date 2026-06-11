const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://product_registration_user:productregistration45@165.232.191.122:5432/product_registration'
});

async function checkPerms() {
  try {
    const res = await pool.query('SELECT permission_key FROM permissions WHERE permission_key LIKE \'inventory.%\' OR permission_key LIKE \'products.%\'');
    console.log('Permissions:', res.rows.map(r => r.permission_key));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    pool.end();
  }
}

checkPerms();
