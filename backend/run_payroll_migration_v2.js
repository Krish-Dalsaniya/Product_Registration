const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigrationV2() {
  const client = await pool.connect();
  try {
    console.log('Running payroll migration V2 (adding explicit columns)...');
    await client.query('BEGIN');

    // Update hr_salary_structures
    await client.query(`
      ALTER TABLE hr_salary_structures
      DROP COLUMN IF EXISTS allowances,
      DROP COLUMN IF EXISTS deductions,
      ADD COLUMN IF NOT EXISTS special_allowance DECIMAL(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS travel_allowance DECIMAL(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS medical_allowance DECIMAL(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS pf_deduction DECIMAL(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS professional_tax DECIMAL(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tds DECIMAL(12,2) DEFAULT 0;
    `);

    // Update hr_payrolls
    await client.query(`
      ALTER TABLE hr_payrolls
      DROP COLUMN IF EXISTS allowances,
      DROP COLUMN IF EXISTS deductions,
      ADD COLUMN IF NOT EXISTS special_allowance DECIMAL(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS travel_allowance DECIMAL(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS medical_allowance DECIMAL(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS pf_deduction DECIMAL(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS professional_tax DECIMAL(12,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tds DECIMAL(12,2) DEFAULT 0;
    `);

    await client.query('COMMIT');
    console.log('Migration V2 successful.');
    process.exit(0);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigrationV2();
