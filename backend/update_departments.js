const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updateDepartments() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Clear old departments/designations (Employees department_id will be set to NULL due to SET NULL constraint)
    console.log('Clearing old departments...');
    await client.query('DELETE FROM hr_designations');
    await client.query('DELETE FROM hr_departments');

    console.log('Inserting new aligned departments...');
    await client.query(`
      INSERT INTO hr_departments (name, description) VALUES 
        ('Admin', 'System administration and management'),
        ('Designers', 'Product design and engineering'),
        ('Sales', 'Sales and opportunity management'),
        ('Maintenance', 'Hardware maintenance and support')
    `);

    // Fetch the inserted departments
    const deptResult = await client.query('SELECT department_id, name FROM hr_departments');
    const depts = {};
    deptResult.rows.forEach(r => depts[r.name] = r.department_id);

    console.log('Inserting aligned designations...');
    if (depts['Admin']) {
      await client.query(`
        INSERT INTO hr_designations (department_id, name) VALUES 
          ($1, 'System Administrator'),
          ($1, 'Operations Manager')
      `, [depts['Admin']]);
    }
    
    if (depts['Designers']) {
      await client.query(`
        INSERT INTO hr_designations (department_id, name) VALUES 
          ($1, 'Electrical Designer'),
          ($1, 'Structural Designer'),
          ($1, 'Software Engineer')
      `, [depts['Designers']]);
    }

    if (depts['Sales']) {
      await client.query(`
        INSERT INTO hr_designations (department_id, name) VALUES 
          ($1, 'Sales Representative'),
          ($1, 'Sales Manager')
      `, [depts['Sales']]);
    }

    if (depts['Maintenance']) {
      await client.query(`
        INSERT INTO hr_designations (department_id, name) VALUES 
          ($1, 'Field Technician'),
          ($1, 'Maintenance Supervisor')
      `, [depts['Maintenance']]);
    }

    await client.query('COMMIT');
    console.log('HR Departments aligned successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

updateDepartments();
