const { pool } = require('../../src/config/db');
const fs = require('fs');
const path = require('path');

async function up() {
  try {
    console.log('Creating hr_trainees table...');
    
    const sql = `
CREATE TABLE IF NOT EXISTS hr_trainees (
  trainee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_code VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  mobile VARCHAR(20),
  gender VARCHAR(20),
  date_of_birth DATE,
  joining_date DATE,
  expected_completion_date DATE,
  department_id UUID REFERENCES hr_departments(department_id) ON DELETE SET NULL,
  mentor_employee_id UUID REFERENCES hr_employees(employee_id) ON DELETE SET NULL,
  training_batch VARCHAR(100),
  education VARCHAR(200),
  institute VARCHAR(200),
  specialization VARCHAR(200),
  status VARCHAR(50) DEFAULT 'Applied',
  remarks TEXT,
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE hr_lms_assignments 
ADD COLUMN IF NOT EXISTS trainee_id UUID REFERENCES hr_trainees(trainee_id) ON DELETE CASCADE;

ALTER TABLE hr_lms_assignments ALTER COLUMN employee_id DROP NOT NULL;
`;

    await pool.query(sql);
    console.log('hr_trainees table created successfully.');
    
    const migrationFilePath = path.join(__dirname, '../../database/migration.sql');
    fs.appendFileSync(migrationFilePath, '\n-- Adding hr_trainees schema\n' + sql + '\n');
    console.log('Appended to migration.sql');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

up();
