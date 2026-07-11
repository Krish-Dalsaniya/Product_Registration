const { Pool } = require('pg');
const env = require('./src/config/env');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

async function run() {
  const client = await pool.connect();
  try {
  const res = await client.query(`
    ALTER TABLE hr_interns ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(user_id);
  `);
  console.log("Column user_id added.");
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
