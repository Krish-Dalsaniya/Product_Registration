const { pool } = require('../../src/config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Adding extended payroll fields to hr_salary_structures and hr_payrolls...');

    const tables = ['hr_salary_structures', 'hr_payrolls'];
    
    // Using NUMERIC(10,2) DEFAULT 0 for all money fields
    const columns = [
      'dearness_allowance',
      'performance_incentive',
      'non_compete_incentive',
      'on_project_incentive',
      'recreational_incentive',
      'claims_amount',
      'esi_deduction',
      'internal_emi',
      'personal_advance_deduction',
      'official_advance_deduction',
      'performance_incentive_deduction',
      'on_project_incentive_deduction'
    ];

    for (let table of tables) {
      for (let col of columns) {
        await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${col} NUMERIC(10,2) DEFAULT 0;`);
      }
    }

    // Add attendance fields only to hr_payrolls
    const attendanceColumns = [
      'op_pl',
      'utilized_pl',
      'leave_of_current_month',
      'late_comings',
      'deductable_leave',
      'available_pl',
      'total_working_days',
      'total_days_month'
    ];

    for (let col of attendanceColumns) {
      await client.query(`ALTER TABLE hr_payrolls ADD COLUMN IF NOT EXISTS ${col} NUMERIC(10,2) DEFAULT 0;`);
    }

    await client.query('COMMIT');
    console.log('Extended payroll fields added successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e);
  } finally {
    client.release();
  }
}

migrate();
