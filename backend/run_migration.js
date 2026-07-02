require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    await pool.query(`
      ALTER TABLE hr_attendance 
      ADD COLUMN IF NOT EXISTS late_coming VARCHAR(10) DEFAULT '00:00',
      ADD COLUMN IF NOT EXISTS early_going VARCHAR(10) DEFAULT '00:00',
      ADD COLUMN IF NOT EXISTS break_hours VARCHAR(10) DEFAULT '00:00',
      ADD COLUMN IF NOT EXISTS extra_hours VARCHAR(10) DEFAULT '00:00';
    `);
    console.log("Schema updated successfully.");
  } catch (err) {
    console.error("Error updating schema:", err);
  } finally {
    await pool.end();
  }
}

run();
