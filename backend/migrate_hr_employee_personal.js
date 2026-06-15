const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Adding JSONB columns to hr_employees...');
    
    await client.query(`
      ALTER TABLE hr_employees 
      ADD COLUMN IF NOT EXISTS personal_info JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS address_info JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS education_info JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS emergency_contacts JSONB DEFAULT '[]'::jsonb
    `);

    await client.query('COMMIT');
    console.log('JSONB columns added successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
