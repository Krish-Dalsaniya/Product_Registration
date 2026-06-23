const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function debugGenerate() {
  const month = 6;
  const year = 2026;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log("Fetching employees...");
    const empResult = await client.query(`
      SELECT e.employee_id,
             COALESCE(ss.basic_salary, 0) as basic_salary,
             COALESCE(ss.hra, 0) as hra,
             COALESCE(ss.allowances, 0) as allowances,
             COALESCE(ss.deductions, 0) as deductions
      FROM hr_employees e
      LEFT JOIN hr_salary_structures ss ON e.employee_id = ss.employee_id
      WHERE e.employment_status != 'Terminated'
    `);
    
    console.log(`Found ${empResult.rows.length} employees`);
    
    for (let emp of empResult.rows) {
      const net_salary = parseFloat(emp.basic_salary) + parseFloat(emp.hra) + parseFloat(emp.allowances) - parseFloat(emp.deductions);
      console.log(`Inserting for employee ${emp.employee_id} with net_salary ${net_salary}`);
      
      await client.query(`
        INSERT INTO hr_payrolls (employee_id, month, year, basic_salary, hra, allowances, deductions, net_salary, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Draft')
        ON CONFLICT (employee_id, month, year) DO UPDATE
        SET basic_salary = EXCLUDED.basic_salary,
            hra = EXCLUDED.hra,
            allowances = EXCLUDED.allowances,
            deductions = EXCLUDED.deductions,
            net_salary = EXCLUDED.net_salary,
            updated_at = CURRENT_TIMESTAMP
      `, [
        emp.employee_id, month, year, 
        emp.basic_salary, emp.hra, emp.allowances, emp.deductions, net_salary
      ]);
    }
    
    await client.query('ROLLBACK');
    console.log("Success!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    client.release();
    pool.end();
  }
}

debugGenerate();
