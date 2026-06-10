const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:productregistration45@165.232.191.122:5432/product_registration'
});

async function migrate() {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS designation VARCHAR(100);');
    console.log('Successfully added designation column to users table');
  } catch (error) {
    console.error('Error adding column:', error);
  } finally {
    pool.end();
  }
}

migrate();
