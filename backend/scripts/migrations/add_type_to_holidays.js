const { pool } = require('../../src/config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Adding type column to hr_holidays table...');
    await client.query(`
        ALTER TABLE hr_holidays ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'NATIONAL';
    `);
    await client.query('COMMIT');
    console.log('type column added successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
