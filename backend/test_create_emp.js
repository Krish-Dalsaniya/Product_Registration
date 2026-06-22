const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function test() {
  const client = await pool.connect();
  try {
    const { 
      full_name, email,
      department_id, designation_name,
      manager_id,
      date_of_joining, employment_status, base_salary, work_location,
      personal_info, job_info, pay_info, statutory_info, identities_info
    } = {
      full_name: 'Test Employee', email: 'testemp123456@example.com',
      department_id: null, designation_name: 'Director', manager_id: '',
      date_of_joining: '2025-01-02', employment_status: 'Full-Time', 
      base_salary: '', work_location: '',
      personal_info: { gender: 'Male' }
    };

    await client.query('BEGIN');

    const userRes = await client.query('INSERT INTO users (full_name, email, password_hash, role_id) VALUES ($1, $2, $3, $4) RETURNING user_id', [full_name, email, 'hash', null]);
    const finalUserId = userRes.rows[0].user_id;

    const countRes = await client.query('SELECT COUNT(*) FROM hr_employees');
    const empCode = 'EMP-' + countRes.rows[0].count;

    const empRes = await client.query(`
      INSERT INTO hr_employees (
        user_id, emp_code, department_id, designation_id, manager_id,
        date_of_joining, employment_status, base_salary, work_location,
        personal_info, job_info, pay_info, statutory_info, identities_info
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING employee_id
    `, [
      finalUserId, empCode, department_id, null, manager_id || null,
      date_of_joining, employment_status, base_salary ? parseFloat(base_salary) : null, work_location,
      personal_info ? JSON.stringify(personal_info) : '{}',
      job_info ? JSON.stringify(job_info) : '{}',
      pay_info ? JSON.stringify(pay_info) : '{}',
      statutory_info ? JSON.stringify(statutory_info) : '{}',
      identities_info ? JSON.stringify(identities_info) : '{}'
    ]);

    await client.query('ROLLBACK'); 
    console.log('SUCCESS!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}
test();
