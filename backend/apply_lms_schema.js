const pool = require('./src/config/db');

const sql = `
DROP TABLE IF EXISTS hr_lms_assessments CASCADE;
DROP TABLE IF EXISTS hr_lms_trainer_allocations CASCADE;
DROP TABLE IF EXISTS hr_lms_employee_trainings CASCADE;
DROP TABLE IF EXISTS hr_lms_modules CASCADE;
DROP TABLE IF EXISTS hr_lms_assignments CASCADE;

CREATE TABLE IF NOT EXISTS hr_lms_modules (
    module_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    department_id UUID REFERENCES hr_departments(department_id) ON DELETE SET NULL,
    training_type VARCHAR(50),
    difficulty_level VARCHAR(50),
    duration_hours INTEGER,
    training_url TEXT,
    attachment_url TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_lms_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES hr_lms_modules(module_id) ON DELETE CASCADE,
    employee_id UUID REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    assigned_date DATE NOT NULL,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'Assigned',
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

(async () => {
  try {
    console.log('Dropping old and creating new LMS schema...');
    await pool.query(sql);
    console.log('LMS Schema applied successfully!');
  } catch (err) {
    console.error('Error applying LMS schema:', err);
  } finally {
    process.exit();
  }
})();
