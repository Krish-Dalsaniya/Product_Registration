require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('Running migration...');
    
    // Add email_verified to users
    console.log('Adding email_verified to users...');
    try {
      await pool.query('ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT false;');
    } catch (e) {
      console.log('Column might already exist:', e.message);
    }
    
    // Create password_reset_tokens table
    console.log('Creating password_reset_tokens table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token_hash VARCHAR PRIMARY KEY,
        user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false
      );
    `);
    
    // Create email_verification_tokens table
    console.log('Creating email_verification_tokens table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        token_hash VARCHAR PRIMARY KEY,
        user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false
      );
    `);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    pool.end();
  }
}

migrate();
