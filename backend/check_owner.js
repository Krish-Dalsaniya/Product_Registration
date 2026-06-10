const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://product_registration_user:productregistration45@165.232.191.122:5432/product_registration'
});

async function checkOwner() {
  try {
    const res = await pool.query(`
      SELECT tablename, tableowner
      FROM pg_tables
      WHERE tablename = 'users';
    `);
    console.log('Table Owner Info:', res.rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    pool.end();
  }
}

checkOwner();
