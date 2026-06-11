const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log('Running migration to add reset_otp...');
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp VARCHAR(10);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_otp_expires TIMESTAMP WITH TIME ZONE;
    `);
    console.log('Migration successful.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    pool.end();
  }
}

runMigration();
