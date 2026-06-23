const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  try {
    console.log('Running payroll migration...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hr_salary_structures (
          structure_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
          basic_salary DECIMAL(12,2) DEFAULT 0,
          hra DECIMAL(12,2) DEFAULT 0,
          allowances DECIMAL(12,2) DEFAULT 0,
          deductions DECIMAL(12,2) DEFAULT 0,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(employee_id)
      );

      CREATE TABLE IF NOT EXISTS hr_payrolls (
          payroll_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
          month INTEGER NOT NULL,
          year INTEGER NOT NULL,
          basic_salary DECIMAL(12,2) DEFAULT 0,
          hra DECIMAL(12,2) DEFAULT 0,
          allowances DECIMAL(12,2) DEFAULT 0,
          deductions DECIMAL(12,2) DEFAULT 0,
          net_salary DECIMAL(12,2) DEFAULT 0,
          status VARCHAR(50) DEFAULT 'Draft',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(employee_id, month, year)
      );
    `);
    console.log('Migration successful.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
