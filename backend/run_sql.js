require('dotenv').config();
const { pool } = require('./src/config/db');

async function run() {
  try {
    const res = await pool.query(`
      CREATE TABLE IF NOT EXISTS hr_holidays (
          holiday_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          date DATE NOT NULL UNIQUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Successfully created hr_holidays table.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}
run();
