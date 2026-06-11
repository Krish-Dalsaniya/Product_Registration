const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://product_registration_user:productregistration45@165.232.191.122:5432/product_registration'
});

async function checkUser() {
  try {
    const res = await pool.query("SELECT * FROM users WHERE full_name ILIKE '%Yuvraj%' LIMIT 1;");
    console.log('User data:', res.rows);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    pool.end();
  }
}

checkUser();
