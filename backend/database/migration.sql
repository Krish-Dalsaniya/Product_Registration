-- ==============================================================================
-- DATABASE MIGRATION SCRIPT
-- Applies the Users Company and Granular Access Control updates
-- ==============================================================================

BEGIN;

-- 1. Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS company VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_custom_permissions BOOLEAN DEFAULT false;

-- 1b. Add created_by to customers and book_a_sale for non-admin dashboards
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE book_a_sale ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id) ON DELETE SET NULL;

-- 2. Update v_admin_user_panel view to include the company column
DROP VIEW IF EXISTS v_admin_user_panel;
CREATE VIEW v_admin_user_panel AS
SELECT u.user_id,
  u.full_name,
  u.email,
  u.company,
  u.image_url,
  r.role_name,
  u.is_active,
  u.created_at,
  COALESCE(json_agg(json_build_object('team_id', t.team_id, 'team_name', t.team_name)) FILTER (WHERE (t.team_id IS NOT NULL)), '[]'::json) AS teams
FROM (((users u
  JOIN roles r ON ((r.role_id = u.role_id)))
  LEFT JOIN team_members tm ON ((tm.user_id = u.user_id)))
  LEFT JOIN teams t ON ((t.team_id = tm.team_id)))
WHERE (((r.role_name)::text <> 'Admin'::text) AND (u.is_active = true))
GROUP BY u.user_id, u.full_name, u.email, u.company, u.image_url, r.role_name, u.is_active, u.created_at;

-- 3. Create user_permissions table for user-level access overrides
CREATE TABLE IF NOT EXISTS user_permissions (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    permission_id INT REFERENCES permissions(permission_id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, permission_id)
);

-- ==============================================================================
-- 4. DATA MIGRATION: Permissions and Role Assignments
-- Uses an anonymous DO block to handle logic natively in PostgreSQL
-- ==============================================================================
DO $$ 
DECLARE 
    r RECORD;
    mod_name VARCHAR;
    act_name VARCHAR;
    sub_name VARCHAR;
    subsections VARCHAR[];
    new_key VARCHAR;
    new_perm_id INT;
BEGIN
    -- A) Remove unused actions (export, publish, assign)
    DELETE FROM role_permissions WHERE permission_id IN (
        SELECT permission_id FROM permissions WHERE permission_key LIKE '%.export' OR permission_key LIKE '%.publish' OR permission_key LIKE '%.assign'
    );
    DELETE FROM permissions WHERE permission_key LIKE '%.export' OR permission_key LIKE '%.publish' OR permission_key LIKE '%.assign';

    -- B) Remove .comm_view completely
    DELETE FROM role_permissions WHERE permission_id IN (SELECT permission_id FROM permissions WHERE permission_key LIKE '%.comm_view');
    DELETE FROM permissions WHERE permission_key LIKE '%.comm_view';

    -- C) Rename .tech_view to .view globally
    UPDATE permissions 
    SET permission_key = REPLACE(permission_key, '.tech_view', '.view'),
        description = 'Allow view on ' || SPLIT_PART(REPLACE(permission_key, '.tech_view', '.view'), '.', 1)
    WHERE permission_key LIKE '%.tech_view';

    -- D) Create a temporary table to store existing products and inventory role assignments
    CREATE TEMP TABLE temp_old_role_perms ON COMMIT DROP AS
    SELECT rp.role_id, p.permission_key
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.permission_id
    WHERE p.permission_key LIKE 'products.%' OR p.permission_key LIKE 'inventory.%';

    -- E) Delete old top-level products and inventory permissions
    DELETE FROM role_permissions WHERE permission_id IN (SELECT permission_id FROM permissions WHERE permission_key LIKE 'products.%' OR permission_key LIKE 'inventory.%');
    DELETE FROM permissions WHERE permission_key LIKE 'products.%' OR permission_key LIKE 'inventory.%';

    -- F) Insert new granular sub-section permissions
    INSERT INTO permissions (permission_key, description) VALUES 
        ('products.general.view', 'Allow view on products (general)'),
        ('products.general.create', 'Allow create on products (general)'),
        ('products.general.edit', 'Allow edit on products (general)'),
        ('products.general.delete', 'Allow delete on products (general)'),
        ('products.tech_spec.view', 'Allow view on products (tech_spec)'),
        ('products.tech_spec.create', 'Allow create on products (tech_spec)'),
        ('products.tech_spec.edit', 'Allow edit on products (tech_spec)'),
        ('products.tech_spec.delete', 'Allow delete on products (tech_spec)'),
        ('products.bom.view', 'Allow view on products (bom)'),
        ('products.bom.create', 'Allow create on products (bom)'),
        ('products.bom.edit', 'Allow edit on products (bom)'),
        ('products.bom.delete', 'Allow delete on products (bom)'),
        ('products.files.view', 'Allow view on products (files)'),
        ('products.files.create', 'Allow create on products (files)'),
        ('products.files.edit', 'Allow edit on products (files)'),
        ('products.files.delete', 'Allow delete on products (files)'),
        ('inventory.general.view', 'Allow view on inventory (general)'),
        ('inventory.general.create', 'Allow create on inventory (general)'),
        ('inventory.general.edit', 'Allow edit on inventory (general)'),
        ('inventory.general.delete', 'Allow delete on inventory (general)'),
        ('inventory.tech_spec.view', 'Allow view on inventory (tech_spec)'),
        ('inventory.tech_spec.create', 'Allow create on inventory (tech_spec)'),
        ('inventory.tech_spec.edit', 'Allow edit on inventory (tech_spec)'),
        ('inventory.tech_spec.delete', 'Allow delete on inventory (tech_spec)'),
        ('inventory.files.view', 'Allow view on inventory (files)'),
        ('inventory.files.create', 'Allow create on inventory (files)'),
        ('inventory.files.edit', 'Allow edit on inventory (files)'),
        ('inventory.files.delete', 'Allow delete on inventory (files)')
    ON CONFLICT (permission_key) DO NOTHING;

    -- G) Restore role permissions based on their old top-level access
    FOR r IN SELECT * FROM temp_old_role_perms LOOP
        mod_name := SPLIT_PART(r.permission_key, '.', 1);
        act_name := SPLIT_PART(r.permission_key, '.', 2);
        
        -- Map legacy views
        IF act_name = 'tech_view' OR act_name = 'comm_view' THEN
            act_name := 'view';
        END IF;

        -- Define subsections based on module
        IF mod_name = 'products' THEN
            subsections := ARRAY['general', 'tech_spec', 'bom', 'files'];
        ELSE
            subsections := ARRAY['general', 'tech_spec', 'files'];
        END IF;

        -- Loop through subsections and assign the new permissions to the role
        FOREACH sub_name IN ARRAY subsections LOOP
            new_key := mod_name || '.' || sub_name || '.' || act_name;
            
            -- Get the permission_id for the newly inserted key
            SELECT permission_id INTO new_perm_id FROM permissions WHERE permission_key = new_key;
            
            IF new_perm_id IS NOT NULL THEN
                -- Insert safely ignoring conflicts if already assigned
                INSERT INTO role_permissions (role_id, permission_id) 
                VALUES (r.role_id, new_perm_id)
                ON CONFLICT (role_id, permission_id) DO NOTHING;
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- 5. User Security & Extensions
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_password_reset (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    requires_password_change BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS user_email_verified (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    is_verified BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS user_mobile (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    mobile_number VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS user_two_factor (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    two_factor_secret VARCHAR(255),
    is_two_factor_enabled BOOLEAN DEFAULT false
);

-- 6. HR Module Tables
CREATE TABLE IF NOT EXISTS hr_departments (
    department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_designations (
    designation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES hr_departments(department_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(department_id, name)
);

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

CREATE TABLE IF NOT EXISTS leave_balances (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    total_days NUMERIC(5,2) DEFAULT 0,
    used_days NUMERIC(5,2) DEFAULT 0,
    year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, leave_type, year)
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. User Security & Extensions
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(255),
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_password_reset (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    requires_password_change BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS user_email_verified (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    is_verified BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS user_mobile (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    mobile_number VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS user_two_factor (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    two_factor_secret VARCHAR(255),
    is_two_factor_enabled BOOLEAN DEFAULT false
);

-- 6. HR Module Tables
CREATE TABLE IF NOT EXISTS hr_departments (
    department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_designations (
    designation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES hr_departments(department_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(department_id, name)
);

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

CREATE TABLE IF NOT EXISTS leave_balances (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    total_days NUMERIC(5,2) DEFAULT 0,
    used_days NUMERIC(5,2) DEFAULT 0,
    year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, leave_type, year)
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_holidays (
    holiday_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    date DATE NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_salary_structures (
    structure_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
    basic_salary DECIMAL(12,2) DEFAULT 0,
    hra DECIMAL(12,2) DEFAULT 0,
    special_allowance DECIMAL(12,2) DEFAULT 0,
    travel_allowance DECIMAL(12,2) DEFAULT 0,
    medical_allowance DECIMAL(12,2) DEFAULT 0,
    pf_deduction DECIMAL(12,2) DEFAULT 0,
    professional_tax DECIMAL(12,2) DEFAULT 0,
    tds DECIMAL(12,2) DEFAULT 0,
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
    special_allowance DECIMAL(12,2) DEFAULT 0,
    travel_allowance DECIMAL(12,2) DEFAULT 0,
    medical_allowance DECIMAL(12,2) DEFAULT 0,
    pf_deduction DECIMAL(12,2) DEFAULT 0,
    professional_tax DECIMAL(12,2) DEFAULT 0,
    tds DECIMAL(12,2) DEFAULT 0,
    net_salary DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, month, year)
);

CREATE TABLE IF NOT EXISTS hr_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'Pending',
    offer_acceptance_date DATE,
    document_checklist JSONB DEFAULT '[]'::jsonb,
    asset_checklist JSONB DEFAULT '[]'::jsonb,
    training_checklist JSONB DEFAULT '[]'::jsonb,
    rcd_checklist JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_offboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'Resignation Submitted',
    resignation_date DATE,
    last_working_day DATE,
    exit_interview_notes TEXT,
    clearance_checklist JSONB DEFAULT '[]'::jsonb,
    asset_recovery_checklist JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMIT;


-- ==============================================================================
-- MODULE: PMS
-- TABLES: pms_closures, pms_closure_items
-- ==============================================================================

CREATE TABLE IF NOT EXISTS pms_closures (
    closure_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL,
    closure_date DATE NOT NULL,
    total_hours NUMERIC(5,2) DEFAULT 0,
    remarks TEXT,
    status VARCHAR(50) DEFAULT 'Submitted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES hr_employees(employee_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pms_closure_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    closure_id UUID NOT NULL,
    project_id UUID NULL,
    task_description TEXT NOT NULL,
    hours_spent NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (closure_id) REFERENCES pms_closures(closure_id) ON DELETE CASCADE
);

-- ==============================================================================
-- MODULE: PMS
-- TABLES: pms_projects
-- ==============================================================================

CREATE TABLE IF NOT EXISTS pms_projects (
    project_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_code VARCHAR(50) UNIQUE NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    team_id INTEGER NULL,
    product_id INTEGER NULL,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'Planned',
    priority VARCHAR(50) DEFAULT 'Medium',
    progress_percentage NUMERIC(5,2) DEFAULT 0,
    team_lead_id UUID NULL,
    client_handler_id UUID NULL,
    project_members JSONB DEFAULT '[]'::jsonb,
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (team_id) REFERENCES teams(team_id) ON DELETE SET NULL,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE SET NULL,
    FOREIGN KEY (team_lead_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (client_handler_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ==============================================================================
-- MODULE: HR LMS
-- TABLES: hr_lms_modules, hr_lms_assignments
-- ==============================================================================

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
    retest_requested BOOLEAN DEFAULT FALSE,
    retest_approved BOOLEAN DEFAULT FALSE,
    progress_percentage INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- HR CONVERSION REQUESTS (FOR APPROVAL WORKFLOW)
-- ==========================================

CREATE TABLE IF NOT EXISTS hr_conversion_requests (
    request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intern_id UUID REFERENCES hr_interns(intern_id) ON DELETE CASCADE,
    trainee_id UUID REFERENCES hr_trainees(trainee_id) ON DELETE CASCADE,
    target_role VARCHAR(50) NOT NULL, -- 'Trainee' or 'Employee'
    payload JSONB, -- stores base_salary, emp_code, designation_id, etc.
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
    certificate_url TEXT,
    requested_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_lms_assessments (
    assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES hr_lms_assignments(assignment_id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'Passed' or 'Failed'
    remarks TEXT,
    assessed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    assessed_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hr_lms_questions (
    question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES hr_lms_modules(module_id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- MODULE: HR Trainees
-- TABLES: hr_trainees
-- ==============================================================================

CREATE TABLE IF NOT EXISTS hr_trainees (
    trainee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trainee_code VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    mobile VARCHAR(20),
    gender VARCHAR(20),
    date_of_birth DATE,
    joining_date DATE,
    expected_completion_date DATE,
    department_id UUID REFERENCES hr_departments(department_id) ON DELETE SET NULL,
    mentor_employee_id UUID REFERENCES hr_employees(employee_id) ON DELETE SET NULL,
    training_batch VARCHAR(100),
    education VARCHAR(100),
    institute VARCHAR(200),
    specialization VARCHAR(100),
    resume_url TEXT,
    profile_photo TEXT,
    status VARCHAR(50) DEFAULT 'Applied',
    remarks TEXT,
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alter hr_lms_assignments to support trainees
ALTER TABLE hr_lms_assignments ADD COLUMN IF NOT EXISTS trainee_id UUID REFERENCES hr_trainees(trainee_id) ON DELETE CASCADE;
ALTER TABLE hr_lms_assignments ALTER COLUMN employee_id DROP NOT NULL;

-- Adding hr_trainees schema

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


-- Adding image_url to hr_trainees

ALTER TABLE hr_trainees ADD COLUMN IF NOT EXISTS image_url TEXT;

-- ==============================================================================
-- MODULE: HR Attendance (QR + Selfie Liveness Verification)
-- TABLES: company_settings, attendance_verification_tokens
-- ==============================================================================

CREATE TABLE IF NOT EXISTS company_settings (
    setting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(255) UNIQUE NOT NULL,
    office_latitude DECIMAL(10, 8),
    office_longitude DECIMAL(11, 8),
    office_radius_meters INTEGER DEFAULT 200,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance_verification_tokens (
    token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    liveness_challenge VARCHAR(50),
    liveness_status VARCHAR(50),
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS punch_in_selfie_url TEXT;
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS punch_in_latitude DECIMAL(10, 8);
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS punch_in_longitude DECIMAL(11, 8);
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS punch_in_device_info TEXT;
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS punch_in_ip VARCHAR(45);
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS punch_in_liveness_challenge VARCHAR(50);
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS punch_in_liveness_status VARCHAR(50);
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS punch_in_face_match_score DECIMAL(5,2);

ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS punch_out_selfie_url TEXT;
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS punch_out_latitude DECIMAL(10, 8);
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS punch_out_longitude DECIMAL(11, 8);
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS punch_out_device_info TEXT;
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS punch_out_ip VARCHAR(45);
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS punch_out_liveness_challenge VARCHAR(50);
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS punch_out_liveness_status VARCHAR(50);
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS punch_out_face_match_score DECIMAL(5,2);

ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS face_descriptor JSONB;


-- Adding Face Recognition Attendance fields
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS face_embedding JSONB;
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS punch_in_face_match_score DECIMAL(5,2);
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS punch_in_face_status VARCHAR(50);
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS punch_out_face_match_score DECIMAL(5,2);
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS punch_out_face_status VARCHAR(50);

-- ==============================================================================
-- HR Claims and Advances Schema
-- ==============================================================================

CREATE TABLE IF NOT EXISTS hr_claims (
    claim_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
    claim_type VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    receipt_url VARCHAR(512),
    status VARCHAR(20) DEFAULT 'Pending',
    submitted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    approved_date TIMESTAMP,
    remarks TEXT
);

CREATE TABLE IF NOT EXISTS hr_advances (
    advance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    reason TEXT,
    repayment_term_months INT NOT NULL,
    monthly_deduction DECIMAL(12,2) NOT NULL,
    months_paid INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'Pending',
    submitted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    approved_date TIMESTAMP,
    remarks TEXT
);

-- Add org_chart_parent_id for independent org chart structure
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS org_chart_parent_id UUID REFERENCES hr_employees(employee_id) ON DELETE SET NULL;

-- Make hr_designations hierarchical for organogram
ALTER TABLE hr_designations ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES hr_designations(designation_id) ON DELETE SET NULL;
ALTER TABLE hr_designations ADD COLUMN IF NOT EXISTS job_description TEXT;
ALTER TABLE hr_designations ADD COLUMN IF NOT EXISTS perks TEXT;


-- Add extra details fields to hr_designations
ALTER TABLE hr_designations ADD COLUMN IF NOT EXISTS rcd_document_url TEXT;
ALTER TABLE hr_designations ADD COLUMN IF NOT EXISTS pre_requisites TEXT;
ALTER TABLE hr_designations ADD COLUMN IF NOT EXISTS training_requirements TEXT;
ALTER TABLE hr_designations ADD COLUMN IF NOT EXISTS eligibility_criteria TEXT;
ALTER TABLE hr_designations ADD COLUMN IF NOT EXISTS kpi TEXT;
ALTER TABLE hr_designations ADD COLUMN IF NOT EXISTS kra TEXT;

-- ==============================================================================
-- Candidate Application Table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS hr_candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    position VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    experience_type VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(50),
    mobile VARCHAR(50),
    current_location VARCHAR(255),
    relocate BOOLEAN DEFAULT true,
    education_route VARCHAR(50) DEFAULT 'REGULAR',
    total_years NUMERIC,
    designation VARCHAR(255),
    current_company VARCHAR(255),
    past_experiences JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add JSONB column for technical/role-specific assessment details
ALTER TABLE hr_candidates ADD COLUMN IF NOT EXISTS technical_details JSONB DEFAULT '{}';

COMMIT;

-- Added advanced attendance metrics
ALTER TABLE hr_attendance ADD COLUMN IF NOT EXISTS late_coming VARCHAR(10) DEFAULT '00:00', ADD COLUMN IF NOT EXISTS early_going VARCHAR(10) DEFAULT '00:00', ADD COLUMN IF NOT EXISTS break_hours VARCHAR(10) DEFAULT '00:00', ADD COLUMN IF NOT EXISTS extra_hours VARCHAR(10) DEFAULT '00:00';
ALTER TABLE hr_employees ADD COLUMN IF NOT EXISTS emergency_info JSONB, ADD COLUMN IF NOT EXISTS family_info JSONB;

ALTER TABLE hr_candidates ADD COLUMN IF NOT EXISTS education_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE hr_candidates ADD COLUMN IF NOT EXISTS trello_metadata JSONB DEFAULT '{}'::jsonb;

-- ==============================================================================
-- MODULE: PMS TASK MANAGEMENT
-- TABLES: pms_tasks, pms_task_comments, pms_task_activity_logs, etc.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS pms_tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_title VARCHAR(255) NOT NULL,
    task_description TEXT,
    task_type VARCHAR(50) DEFAULT 'Task',
    project_id UUID REFERENCES pms_projects(project_id) ON DELETE SET NULL,
    team_id INTEGER REFERENCES teams(team_id) ON DELETE SET NULL,
    assignee_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    reporter_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    reviewer_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES pms_tasks(task_id) ON DELETE CASCADE,
    tags JSONB DEFAULT '[]'::jsonb,
    priority VARCHAR(50) DEFAULT 'Medium',
    status VARCHAR(50) DEFAULT 'Backlog',
    start_date DATE,
    due_date DATE,
    estimated_hours NUMERIC(5,2) DEFAULT 0,
    remaining_hours NUMERIC(5,2) DEFAULT 0,
    actual_logged_hours NUMERIC(5,2) DEFAULT 0,
    attachments JSONB DEFAULT '[]'::jsonb,
    related_links JSONB DEFAULT '[]'::jsonb,
    dependency_tasks JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pms_task_comments (
    comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES pms_tasks(task_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    mentions JSONB DEFAULT '[]'::jsonb,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pms_task_activity_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES pms_tasks(task_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pms_task_attachments (
    attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES pms_tasks(task_id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(user_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    file_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pms_task_watchers (
    task_id UUID REFERENCES pms_tasks(task_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, user_id)
);

CREATE TABLE IF NOT EXISTS pms_task_time_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES pms_tasks(task_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    hours_logged NUMERIC(5,2) NOT NULL,
    log_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pms_task_dependencies (
    task_id UUID REFERENCES pms_tasks(task_id) ON DELETE CASCADE,
    depends_on_task_id UUID REFERENCES pms_tasks(task_id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'Blocks',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, depends_on_task_id)
);

-- ==============================================================================
-- MODULE: PMS SCRUMS & SPRINTS
-- TABLES: pms_sprints
-- ==============================================================================

CREATE TABLE IF NOT EXISTS pms_sprints (
    sprint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES pms_projects(project_id) ON DELETE CASCADE,
    sprint_name VARCHAR(255) NOT NULL,
    goal TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'Planning', -- Planning, Active, Completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE pms_tasks ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES pms_sprints(sprint_id) ON DELETE SET NULL;
ALTER TABLE pms_tasks ADD COLUMN IF NOT EXISTS story_points INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS pms_epics (
    epic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES pms_projects(project_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Planning', -- Planning, In Progress, Completed
    start_date DATE,
    target_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE pms_tasks ADD COLUMN IF NOT EXISTS epic_id UUID REFERENCES pms_epics(epic_id) ON DELETE SET NULL;


-- ==============================================================================
-- MODULE: HR RECRUITMENT
-- TABLES: candidate_evaluation_forms
-- ==============================================================================

CREATE TABLE IF NOT EXISTS candidate_evaluation_forms (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    label VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size VARCHAR(50),
    file_path TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS open_positions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  skills_form_id INT REFERENCES candidate_evaluation_forms(id) ON DELETE SET NULL,
  knowledge_form_id INT REFERENCES candidate_evaluation_forms(id) ON DELETE SET NULL,
  traits_form_id INT REFERENCES candidate_evaluation_forms(id) ON DELETE SET NULL,
  self_image_form_id INT REFERENCES candidate_evaluation_forms(id) ON DELETE SET NULL,
  motive_form_id INT REFERENCES candidate_evaluation_forms(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add designation_id to hr_trainees
ALTER TABLE hr_trainees ADD COLUMN IF NOT EXISTS designation_id UUID REFERENCES hr_designations(designation_id) ON DELETE SET NULL;

-- ==============================================================================
-- Git Engine Integration Metadata
-- ==============================================================================

-- Add Git metadata to pms_projects
ALTER TABLE pms_projects 
ADD COLUMN IF NOT EXISTS repository_owner VARCHAR(255),
ADD COLUMN IF NOT EXISTS repository_name VARCHAR(255);

-- Add Git metadata to finished_goods
ALTER TABLE finished_goods 
ADD COLUMN IF NOT EXISTS repository_owner VARCHAR(255),
ADD COLUMN IF NOT EXISTS repository_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS branch VARCHAR(255),
ADD COLUMN IF NOT EXISTS commit_sha VARCHAR(255),
ADD COLUMN IF NOT EXISTS tag VARCHAR(255),
ADD COLUMN IF NOT EXISTS release_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS workflow_run_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS build_number VARCHAR(255),
ADD COLUMN IF NOT EXISTS firmware_binary_url VARCHAR(500);

-- Candidate experiences schema changes
ALTER TABLE hr_candidates DROP COLUMN IF EXISTS monthly_taken_home;
ALTER TABLE hr_candidates DROP COLUMN IF EXISTS expected_monthly;
ALTER TABLE hr_candidates ADD COLUMN IF NOT EXISTS past_experiences JSONB DEFAULT '[]'::jsonb;

-- 2026-07-10: Add policy_checklist to hr_onboarding
ALTER TABLE hr_onboarding ADD COLUMN IF NOT EXISTS policy_checklist JSONB DEFAULT '[]'::jsonb;

-- MODULE: HR Interns
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

-- ==============================================================================
-- 2026-07-10
-- HR Candidates
-- Replace position column with multi-select applied_at and shortlisted_for
-- ==============================================================================
ALTER TABLE hr_candidates ADD COLUMN IF NOT EXISTS applied_at JSONB DEFAULT '[]'::jsonb;
ALTER TABLE hr_candidates ADD COLUMN IF NOT EXISTS shortlisted_for JSONB DEFAULT '[]'::jsonb;

-- Add user_id to hr_interns
ALTER TABLE hr_interns ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(user_id);

-- ==============================================================================
-- 2026-07-14
-- PLM and Firmware Lifecycle Architecture Updates
-- ==============================================================================

-- 1. Expand PROCESSOR_MASTER
ALTER TABLE PROCESSOR_MASTER ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255) DEFAULT 'N/A';
ALTER TABLE PROCESSOR_MASTER ADD COLUMN IF NOT EXISTS core VARCHAR(100) DEFAULT 'N/A';
ALTER TABLE PROCESSOR_MASTER ADD COLUMN IF NOT EXISTS flash VARCHAR(100) DEFAULT 'N/A';
ALTER TABLE PROCESSOR_MASTER ADD COLUMN IF NOT EXISTS ram VARCHAR(100) DEFAULT 'N/A';
ALTER TABLE PROCESSOR_MASTER ADD COLUMN IF NOT EXISTS clock VARCHAR(100) DEFAULT 'N/A';
ALTER TABLE PROCESSOR_MASTER ADD COLUMN IF NOT EXISTS stock_quantity INT DEFAULT 0;

-- 2. Add repository_name to FIRMWARE_MASTER
ALTER TABLE FIRMWARE_MASTER ADD COLUMN IF NOT EXISTS repository_name VARCHAR(255);

-- 3. Link Firmware Versions to Git
ALTER TABLE FIRMWARE_VERSION_MASTER ADD COLUMN IF NOT EXISTS git_commit VARCHAR(40);
ALTER TABLE FIRMWARE_VERSION_MASTER ADD COLUMN IF NOT EXISTS git_tag VARCHAR(100);

-- 4. Create FIRMWARE_RELEASE_MASTER
CREATE TABLE IF NOT EXISTS FIRMWARE_RELEASE_MASTER (
    release_id BIGSERIAL PRIMARY KEY,
    firmware_version_id BIGINT REFERENCES FIRMWARE_VERSION_MASTER(firmware_version_id) ON DELETE CASCADE,
    release_number VARCHAR(100),
    release_notes TEXT,
    release_date TIMESTAMPTZ,
    released_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    environment VARCHAR(50),
    release_status VARCHAR(50) DEFAULT 'Active',
    binary_url TEXT,
    checksum VARCHAR(255)
);

-- 5. Track Product Version in Finished Goods
ALTER TABLE FINISHED_GOODS ADD COLUMN IF NOT EXISTS product_version_id BIGINT REFERENCES PRODUCT_VERSION_MASTER(product_version_id) ON DELETE SET NULL;

-- ==============================================================================
-- 2026-07-15
-- Enterprise Dynamic Form Engine Architecture Updates
-- ==============================================================================

-- 1. Forms Master Table
CREATE TABLE IF NOT EXISTS forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Draft', -- Draft, Published, Archived, Closed
    is_public BOOLEAN DEFAULT false,
    public_url UUID UNIQUE DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Form Settings
CREATE TABLE IF NOT EXISTS form_settings (
    form_id UUID PRIMARY KEY REFERENCES forms(id) ON DELETE CASCADE,
    theme JSONB DEFAULT '{}',
    language VARCHAR(50) DEFAULT 'en',
    thank_you_message TEXT,
    is_anonymous BOOLEAN DEFAULT false,
    one_response_per_user BOOLEAN DEFAULT false,
    password_hash VARCHAR(255),
    access_expiry_date TIMESTAMPTZ,
    max_responses INT,
    closing_message TEXT
);

-- 3. Form Sections
CREATE TABLE IF NOT EXISTS form_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    title VARCHAR(255),
    description TEXT,
    order_index INT NOT NULL,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Question Bank Categories
CREATE TABLE IF NOT EXISTS question_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT
);

-- 5. Question Bank
CREATE TABLE IF NOT EXISTS question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES question_categories(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    label TEXT NOT NULL,
    default_schema JSONB,
    difficulty VARCHAR(50),
    tags TEXT[],
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Form Questions
CREATE TABLE IF NOT EXISTS form_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    section_id UUID REFERENCES form_sections(id) ON DELETE CASCADE,
    bank_question_id UUID REFERENCES question_bank(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL,
    label TEXT NOT NULL,
    placeholder VARCHAR(255),
    help_text TEXT,
    is_required BOOLEAN DEFAULT false,
    is_hidden BOOLEAN DEFAULT false,
    is_read_only BOOLEAN DEFAULT false,
    order_index INT NOT NULL,
    config JSONB DEFAULT '{}',
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Question Options
CREATE TABLE IF NOT EXISTS question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES form_questions(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    value VARCHAR(255),
    order_index INT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    score DECIMAL(10, 2) DEFAULT 0,
    negative_score DECIMAL(10, 2) DEFAULT 0,
    is_correct BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false
);

-- 7b. Question Rows (For Grid Types)
CREATE TABLE IF NOT EXISTS question_rows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES form_questions(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    order_index INT NOT NULL,
    is_archived BOOLEAN DEFAULT false
);

-- 8. Question Validations
CREATE TABLE IF NOT EXISTS question_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES form_questions(id) ON DELETE CASCADE UNIQUE,
    char_limit_min INT,
    char_limit_max INT,
    num_min DECIMAL,
    num_max DECIMAL,
    regex_pattern TEXT,
    allowed_file_types TEXT[],
    max_file_size_kb INT,
    max_files INT
);

-- 9. Question Logic
CREATE TABLE IF NOT EXISTS question_logic (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES form_questions(id) ON DELETE CASCADE,
    condition_type VARCHAR(50), -- IF, AND, OR
    target_question_id UUID REFERENCES form_questions(id) ON DELETE CASCADE,
    operator VARCHAR(50), -- EQUALS, GREATER_THAN, etc.
    value VARCHAR(255),
    action VARCHAR(50), -- SHOW, HIDE, SKIP
    action_target_id UUID -- Could be section or question id
);

-- 10. Question Media
CREATE TABLE IF NOT EXISTS question_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES form_questions(id) ON DELETE CASCADE,
    media_type VARCHAR(50), -- IMAGE, VIDEO, PDF
    url TEXT NOT NULL,
    caption VARCHAR(255)
);

-- 11. Question Scores (Calculated Rules)
CREATE TABLE IF NOT EXISTS question_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES form_questions(id) ON DELETE CASCADE UNIQUE,
    total_marks DECIMAL(10, 2) DEFAULT 0,
    formula TEXT -- For calculated fields
);

-- 12. Form Responses
CREATE TABLE IF NOT EXISTS form_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    respondent_id UUID REFERENCES users(user_id) ON DELETE SET NULL, -- Null if anonymous
    respondent_email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Submitted', -- Draft, Submitted
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    total_score DECIMAL(10, 2) DEFAULT 0,
    is_passed BOOLEAN,
    ip_address VARCHAR(45)
);

-- 13. Response Answers
CREATE TABLE IF NOT EXISTS response_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID REFERENCES form_responses(id) ON DELETE CASCADE,
    question_id UUID REFERENCES form_questions(id) ON DELETE CASCADE,
    text_value TEXT,
    number_value DECIMAL,
    date_value TIMESTAMPTZ,
    file_url TEXT
);

-- 14. Response Selected Options (For Multi-Choice)
CREATE TABLE IF NOT EXISTS response_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    answer_id UUID REFERENCES response_answers(id) ON DELETE CASCADE,
    option_id UUID REFERENCES question_options(id) ON DELETE CASCADE
);

-- 14b. Response Grid Answers
CREATE TABLE IF NOT EXISTS response_grid_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    answer_id UUID REFERENCES response_answers(id) ON DELETE CASCADE,
    row_id UUID REFERENCES question_rows(id) ON DELETE CASCADE,
    option_id UUID REFERENCES question_options(id) ON DELETE CASCADE
);

-- 14c. Response Files
CREATE TABLE IF NOT EXISTS response_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    answer_id UUID REFERENCES response_answers(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    original_name VARCHAR(255),
    file_size INT,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 15. Audit Logs for Forms
CREATE TABLE IF NOT EXISTS form_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    performed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 16. Form Versions
CREATE TABLE IF NOT EXISTS form_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    form_schema JSONB NOT NULL,
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add form_mode to candidate_evaluation_forms
ALTER TABLE candidate_evaluation_forms ADD COLUMN IF NOT EXISTS form_mode VARCHAR(20) DEFAULT 'assessment';

-- Add form_mode to forms
ALTER TABLE forms ADD COLUMN IF NOT EXISTS form_mode VARCHAR(20) DEFAULT 'assessment';
