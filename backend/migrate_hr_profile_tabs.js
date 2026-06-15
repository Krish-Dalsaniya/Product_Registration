require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting migration to add profile tab JSONB columns...');
    await client.query('BEGIN');

    const addColumnQueries = [
      `ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS job_info JSONB DEFAULT '{}'::jsonb;`,
      `ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS pay_info JSONB DEFAULT '{}'::jsonb;`,
      `ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS statutory_info JSONB DEFAULT '{}'::jsonb;`,
      `ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS identities_info JSONB DEFAULT '{}'::jsonb;`
    ];

    for (const query of addColumnQueries) {
      console.log(`Executing: ${query}`);
      await client.query(query);
    }

    await client.query('COMMIT');
    console.log('Migration successful: job_info, pay_info, statutory_info, identities_info added.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
