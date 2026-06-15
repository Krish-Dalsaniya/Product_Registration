const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Creating hr_departments table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS hr_departments (
          department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL UNIQUE,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Creating hr_designations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS hr_designations (
          designation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          department_id UUID REFERENCES hr_departments(department_id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(department_id, name)
      );
    `);

    console.log('Creating hr_employees table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS hr_employees (
          employee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
          emp_code VARCHAR(50) UNIQUE NOT NULL,
          department_id UUID REFERENCES hr_departments(department_id) ON DELETE SET NULL,
          designation_id UUID REFERENCES hr_designations(designation_id) ON DELETE SET NULL,
          manager_id UUID REFERENCES hr_employees(employee_id) ON DELETE SET NULL,
          date_of_joining DATE NOT NULL,
          employment_status VARCHAR(50) DEFAULT 'Full-Time',
          work_location VARCHAR(100),
          base_salary DECIMAL(12,2),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Inserting default departments and designations...');
    await client.query(`
      INSERT INTO hr_departments (name) VALUES 
        ('Engineering'),
        ('Human Resources'),
        ('Sales'),
        ('Management')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Fetch the inserted departments to get their IDs
    const deptResult = await client.query('SELECT department_id, name FROM hr_departments');
    const depts = {};
    deptResult.rows.forEach(r => depts[r.name] = r.department_id);

    if (depts['Engineering']) {
      await client.query(`
        INSERT INTO hr_designations (department_id, name) VALUES 
          ($1, 'Software Engineer'),
          ($1, 'Engineering Manager')
        ON CONFLICT (department_id, name) DO NOTHING;
      `, [depts['Engineering']]);
    }
    
    if (depts['Human Resources']) {
      await client.query(`
        INSERT INTO hr_designations (department_id, name) VALUES 
          ($1, 'HR Executive'),
          ($1, 'HR Manager')
        ON CONFLICT (department_id, name) DO NOTHING;
      `, [depts['Human Resources']]);
    }

    await client.query('COMMIT');
    console.log('HR Employees schema migration successful.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
