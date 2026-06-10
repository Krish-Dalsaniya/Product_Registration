const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://product_registration_user:productregistration45@165.232.191.122:5432/product_registration'
});

async function checkColumn() {
  try {
    await pool.query('SELECT designation FROM users LIMIT 1;');
    console.log('Column exists!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    pool.end();
  }
}

checkColumn();
