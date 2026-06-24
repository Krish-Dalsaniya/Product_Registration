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

CREATE TABLE IF NOT EXISTS hr_holidays (
    holiday_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
