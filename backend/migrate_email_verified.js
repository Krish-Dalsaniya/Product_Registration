require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('Running migration...');
    
    // Create user_email_verified table
    console.log('Creating user_email_verified table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_email_verified (
        user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
        is_verified BOOLEAN DEFAULT false
      );
    `);
    
    // Insert existing users as verified
    console.log('Marking existing users as verified...');
    await pool.query(`
      INSERT INTO user_email_verified (user_id, is_verified)
      SELECT user_id, true FROM users
      ON CONFLICT (user_id) DO NOTHING;
    `);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    pool.end();
  }
}

migrate();
