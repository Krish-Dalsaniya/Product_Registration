-- ==============================================================================
-- HR Module Schema Export
-- Run this script on your testing/staging databases to sync the HR tables
-- ==============================================================================

BEGIN;

-- 1. Departments
CREATE TABLE IF NOT EXISTS hr_departments (
    department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Designations
CREATE TABLE IF NOT EXISTS hr_designations (
    designation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES hr_departments(department_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(department_id, name)
);

-- 3. Employees
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

-- 4. Attendance
CREATE TABLE IF NOT EXISTS hr_attendance (
    attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in TIMESTAMP,
    clock_out TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Present',
    work_hours NUMERIC(5,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);

-- 5. Leave Balances
CREATE TABLE IF NOT EXISTS leave_balances (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL, -- e.g., 'PTO', 'Sick Leave', 'Personal'
    total_days NUMERIC(5,2) DEFAULT 0,
    used_days NUMERIC(5,2) DEFAULT 0,
    year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, leave_type, year)
);

-- 6. Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optional: Insert Default Departments & Designations
INSERT INTO hr_departments (name) VALUES 
  ('Engineering'),
  ('Human Resources'),
  ('Sales'),
  ('Management')
ON CONFLICT (name) DO NOTHING;

-- 7. Holidays
CREATE TABLE IF NOT EXISTS hr_holidays (
    holiday_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    date DATE NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
