const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const sql = `
CREATE TABLE IF NOT EXISTS hr_interns (
  intern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_code VARCHAR(50) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  mobile VARCHAR(20),
  gender VARCHAR(20),
  date_of_birth DATE,
  joining_date DATE,
  expected_completion_date DATE,
  department_id UUID REFERENCES hr_departments(department_id) ON DELETE SET NULL,
  designation_id UUID REFERENCES hr_designations(designation_id) ON DELETE SET NULL,
  mentor_employee_id UUID REFERENCES hr_employees(employee_id) ON DELETE SET NULL,
  training_batch VARCHAR(100),
  education VARCHAR(200),
  institute VARCHAR(200),
  specialization VARCHAR(200),
  status VARCHAR(50) DEFAULT 'Applied',
  remarks TEXT,
  image_url TEXT,
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE hr_lms_assignments 
ADD COLUMN IF NOT EXISTS intern_id UUID REFERENCES hr_interns(intern_id) ON DELETE CASCADE;
`;

pool.query(sql)
  .then(() => console.log('Migration applied'))
  .catch(e => console.error(e))
  .finally(() => pool.end());
