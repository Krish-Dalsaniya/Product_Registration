const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function update() {
  try {
    await pool.query("ALTER TABLE electrical_tech_spec ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP");
    console.log('SUCCESS: Added updated_at column to electrical_tech_spec');
  } catch (e) {
    console.error('ERROR:', e);
  } finally {
    await pool.end();
  }
}
update();
