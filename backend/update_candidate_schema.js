require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await pool.query(`
      ALTER TABLE hr_candidates 
      ADD COLUMN IF NOT EXISTS extracted_info JSONB DEFAULT '{}'::jsonb;
    `);
    console.log("Schema hr_candidates updated successfully with extracted_info.");
  } catch (err) {
    console.error("Error updating schema:", err);
  } finally {
    await pool.end();
  }
}

run();
