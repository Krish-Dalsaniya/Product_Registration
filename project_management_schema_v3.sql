-- ============================================================
-- PROJECT MANAGEMENT SYSTEM — RBAC SCHEMA  v2
-- PostgreSQL | Updated with:
--   1. projects.product_id FK  (designer domain ↔ products)
--   2. updated_at auto-triggers on all relevant tables
--   3. Row-Level Security (RLS) on sensitive tables
--   4. v_team_project_summary view for admin panel
--   5. Per-role own-data views for scoped access
-- ============================================================

-- ─────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- for gen_random_uuid()

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────
CREATE TYPE user_role      AS ENUM ('Admin', 'Sales', 'Designer', 'Maintenance');
CREATE TYPE project_status AS ENUM ('Planning', 'Active', 'On Hold', 'Completed', 'Cancelled');
CREATE TYPE task_status    AS ENUM ('Open', 'In Progress', 'Blocked', 'Done');
CREATE TYPE task_priority  AS ENUM ('Low', 'Medium', 'High', 'Critical');

-- ============================================================
-- CORE IDENTITY & ACCESS CONTROL
-- ============================================================

-- 1. ROLES
CREATE TABLE roles (
    role_id     SERIAL       PRIMARY KEY,
    role_name   user_role    NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 2. PERMISSIONS
CREATE TABLE permissions (
    permission_id   SERIAL       PRIMARY KEY,
    permission_key  VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 3. ROLE_PERMISSIONS (many-to-many)
CREATE TABLE role_permissions (
    role_id         INT  NOT NULL REFERENCES roles(role_id)           ON DELETE CASCADE,
    permission_id   INT  NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- 4. USERS
CREATE TABLE users (
    user_id       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id       INT          NOT NULL REFERENCES roles(role_id),
    full_name     VARCHAR(150) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT         NOT NULL,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role   ON users(role_id);
CREATE INDEX idx_users_email  ON users(email);
CREATE INDEX idx_users_active ON users(is_active);

-- ─────────────────────────────────────────
-- ADMIN PANEL VIEW
-- Returns all non-Admin users.
-- Filter by role in application layer.
-- ─────────────────────────────────────────
CREATE OR REPLACE VIEW v_admin_user_panel AS
SELECT
    u.user_id,
    u.full_name,
    u.email,
    r.role_name,
    u.is_active,
    u.created_at
FROM users u
JOIN roles r ON r.role_id = u.role_id
WHERE r.role_name <> 'Admin';

-- Usage:
--   All non-admin users:       SELECT * FROM v_admin_user_panel;
--   Designers only:            SELECT * FROM v_admin_user_panel WHERE role_name = 'Designer';
--   Sales only:                SELECT * FROM v_admin_user_panel WHERE role_name = 'Sales';
--   Maintenance only:          SELECT * FROM v_admin_user_panel WHERE role_name = 'Maintenance';

-- ============================================================
-- PRODUCTS  (shared entity used by Sales, Maintenance & Designer)
-- ============================================================

CREATE TABLE products (
    product_id      SERIAL       PRIMARY KEY,
    product_name    VARCHAR(200) NOT NULL,
    product_code    VARCHAR(50)  NOT NULL UNIQUE,
    description     TEXT,
    unit_price      NUMERIC(12,2),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DESIGNER DOMAIN
-- ============================================================

-- 5. DESIGNER_PROFILES  (one-to-one extension of users)
CREATE TABLE designer_profiles (
    designer_id     UUID         PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    specialty       VARCHAR(100),
    portfolio_url   TEXT,
    availability    BOOLEAN      NOT NULL DEFAULT TRUE
);

-- 6. TEAMS
CREATE TABLE teams (
    team_id     SERIAL       PRIMARY KEY,
    team_name   VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 7. TEAM_MEMBERS  (many-to-many: designers ↔ teams)
CREATE TABLE team_members (
    team_id     INT   NOT NULL REFERENCES teams(team_id)                 ON DELETE CASCADE,
    designer_id UUID  NOT NULL REFERENCES designer_profiles(designer_id) ON DELETE CASCADE,
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_lead     BOOLEAN     NOT NULL DEFAULT FALSE,
    PRIMARY KEY (team_id, designer_id)
);

-- 8. PROJECTS
-- FIX #1: Added product_id FK (nullable) so designer projects can be
--          linked to a product, matching the pattern in Sales & Maintenance.
CREATE TABLE projects (
    project_id    SERIAL         PRIMARY KEY,
    team_id       INT            REFERENCES teams(team_id)    ON DELETE SET NULL,
    product_id    INT            REFERENCES products(product_id) ON DELETE SET NULL,  -- NEW
    project_name  VARCHAR(200)   NOT NULL,
    description   TEXT,
    status        project_status NOT NULL DEFAULT 'Planning',
    start_date    DATE,
    end_date      DATE,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_team    ON projects(team_id);
CREATE INDEX idx_projects_status  ON projects(status);
CREATE INDEX idx_projects_product ON projects(product_id);   -- NEW

-- 9. DESIGNER_PROJECTS  (tracks which designer is on which project)
CREATE TABLE designer_projects (
    designer_id     UUID  NOT NULL REFERENCES designer_profiles(designer_id) ON DELETE CASCADE,
    project_id      INT   NOT NULL REFERENCES projects(project_id)           ON DELETE CASCADE,
    role_in_project VARCHAR(100),
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (designer_id, project_id)
);

-- View: active designer assignments (per-designer detail)
CREATE OR REPLACE VIEW v_designer_project_overview AS
SELECT
    u.user_id         AS designer_user_id,
    u.full_name       AS designer_name,
    dp.specialty,
    dp.availability,
    t.team_name,
    p.project_name,
    p.status          AS project_status,
    pr.product_name,                        -- NEW — product linked to project
    pr.product_code,                        -- NEW
    djp.role_in_project,
    djp.assigned_at
FROM designer_projects djp
JOIN designer_profiles dp  ON dp.designer_id = djp.designer_id
JOIN users             u   ON u.user_id       = dp.designer_id
JOIN projects          p   ON p.project_id    = djp.project_id
LEFT JOIN team_members tm  ON tm.designer_id  = dp.designer_id
LEFT JOIN teams        t   ON t.team_id       = tm.team_id
LEFT JOIN products     pr  ON pr.product_id   = p.product_id   -- NEW
WHERE p.status = 'Active';

-- FIX #2: NEW VIEW — team-level project summary for admin panel
-- Admin clicks "Designers" → sees each team and the projects they own.
CREATE OR REPLACE VIEW v_team_project_summary AS
SELECT
    t.team_id,
    t.team_name,
    COUNT(DISTINCT tm.designer_id)  AS member_count,
    COUNT(DISTINCT p.project_id)    AS total_projects,
    COUNT(DISTINCT p.project_id)
        FILTER (WHERE p.status = 'Active')      AS active_projects,
    STRING_AGG(DISTINCT p.project_name, ', ')
        FILTER (WHERE p.status = 'Active')      AS active_project_names,
    STRING_AGG(DISTINCT pr.product_name, ', ')  AS linked_products   -- NEW
FROM teams t
LEFT JOIN team_members    tm ON tm.team_id    = t.team_id
LEFT JOIN projects        p  ON p.team_id     = t.team_id
LEFT JOIN products        pr ON pr.product_id = p.product_id
GROUP BY t.team_id, t.team_name;

-- ============================================================
-- SALES DOMAIN
-- ============================================================

-- 10. SALES_PROFILES  (one-to-one extension of users)
CREATE TABLE sales_profiles (
    sales_id        UUID         PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    region          VARCHAR(100),
    target_revenue  NUMERIC(14,2),
    hire_date       DATE
);

-- 11. SALES_PRODUCTS  (which sales rep is responsible for which products)
CREATE TABLE sales_products (
    sales_id    UUID  NOT NULL REFERENCES sales_profiles(sales_id) ON DELETE CASCADE,
    product_id  INT   NOT NULL REFERENCES products(product_id)     ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_primary  BOOLEAN     NOT NULL DEFAULT FALSE,
    PRIMARY KEY (sales_id, product_id)
);

CREATE INDEX idx_sales_products_product ON sales_products(product_id);

-- 12. SALES_OPPORTUNITIES
CREATE TABLE sales_opportunities (
    opportunity_id  SERIAL       PRIMARY KEY,
    sales_id        UUID         NOT NULL REFERENCES sales_profiles(sales_id),
    product_id      INT          NOT NULL REFERENCES products(product_id),
    client_name     VARCHAR(200) NOT NULL,
    deal_value      NUMERIC(14,2),
    stage           VARCHAR(50)  NOT NULL DEFAULT 'Prospect',
    expected_close  DATE,
    closed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_opp_sales   ON sales_opportunities(sales_id);
CREATE INDEX idx_opp_product ON sales_opportunities(product_id);

-- View: full sales overview (admin can see all; sales reps filtered in app)
CREATE OR REPLACE VIEW v_sales_product_overview AS
SELECT
    u.user_id     AS sales_user_id,
    u.full_name   AS sales_name,
    sp.region,
    sp.target_revenue,
    pr.product_name,
    pr.product_code,
    spr.is_primary,
    spr.assigned_at
FROM sales_products spr
JOIN sales_profiles sp ON sp.sales_id   = spr.sales_id
JOIN users          u  ON u.user_id     = sp.sales_id
JOIN products       pr ON pr.product_id = spr.product_id
WHERE pr.is_active = TRUE;

-- FIX #3: NEW VIEW — own-data scoped view for a Sales user
-- Usage: SELECT * FROM v_my_sales_overview WHERE sales_user_id = :current_user_id
-- This is the view sales users call; they only see their own rows.
CREATE OR REPLACE VIEW v_my_sales_overview AS
SELECT
    u.user_id     AS sales_user_id,
    u.full_name   AS sales_name,
    sp.region,
    pr.product_name,
    pr.product_code,
    spr.is_primary,
    COUNT(so.opportunity_id)                              AS total_opportunities,
    SUM(so.deal_value)                                    AS total_pipeline_value,
    COUNT(so.opportunity_id) FILTER (WHERE so.closed_at IS NOT NULL) AS closed_deals
FROM sales_products spr
JOIN sales_profiles      sp  ON sp.sales_id    = spr.sales_id
JOIN users               u   ON u.user_id      = sp.sales_id
JOIN products            pr  ON pr.product_id  = spr.product_id
LEFT JOIN sales_opportunities so ON so.sales_id = spr.sales_id
                                 AND so.product_id = spr.product_id
WHERE pr.is_active = TRUE
GROUP BY u.user_id, u.full_name, sp.region, pr.product_name, pr.product_code, spr.is_primary;

-- ============================================================
-- MAINTENANCE DOMAIN
-- ============================================================

-- 13. MAINTENANCE_PROFILES  (one-to-one extension of users)
CREATE TABLE maintenance_profiles (
    maintenance_id  UUID         PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    certification   VARCHAR(150),
    hire_date       DATE
);

-- 14. MAINTENANCE_RECORDS
CREATE TABLE maintenance_records (
    record_id       SERIAL       PRIMARY KEY,
    product_id      INT          NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    record_title    VARCHAR(200) NOT NULL,
    description     TEXT,
    scheduled_date  DATE,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mr_product ON maintenance_records(product_id);
CREATE INDEX idx_mr_sched   ON maintenance_records(scheduled_date);

-- 15. MAINTENANCE_TASKS
CREATE TABLE maintenance_tasks (
    task_id         SERIAL        PRIMARY KEY,
    record_id       INT           NOT NULL REFERENCES maintenance_records(record_id) ON DELETE CASCADE,
    maintenance_id  UUID          NOT NULL REFERENCES maintenance_profiles(maintenance_id),
    task_title      VARCHAR(200)  NOT NULL,
    description     TEXT,
    priority        task_priority NOT NULL DEFAULT 'Medium',
    status          task_status   NOT NULL DEFAULT 'Open',
    due_date        DATE,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mt_record ON maintenance_tasks(record_id);
CREATE INDEX idx_mt_staff  ON maintenance_tasks(maintenance_id);
CREATE INDEX idx_mt_status ON maintenance_tasks(status);

-- View: full maintenance overview (admin can see all; staff filtered in app)
CREATE OR REPLACE VIEW v_maintenance_overview AS
SELECT
    u.user_id             AS staff_user_id,
    u.full_name           AS staff_name,
    mp.certification,
    pr.product_name,
    pr.product_code,
    mr.record_title,
    mr.scheduled_date,
    mt.task_title,
    mt.priority,
    mt.status             AS task_status,
    mt.due_date,
    mt.completed_at
FROM maintenance_tasks mt
JOIN maintenance_profiles mp  ON mp.maintenance_id = mt.maintenance_id
JOIN users                u   ON u.user_id          = mp.maintenance_id
JOIN maintenance_records  mr  ON mr.record_id        = mt.record_id
JOIN products             pr  ON pr.product_id       = mr.product_id
ORDER BY mt.priority DESC, mt.due_date;

-- FIX #4: NEW VIEW — own-data scoped view for a Maintenance user
-- Usage: SELECT * FROM v_my_maintenance_overview WHERE staff_user_id = :current_user_id
CREATE OR REPLACE VIEW v_my_maintenance_overview AS
SELECT
    u.user_id             AS staff_user_id,
    u.full_name           AS staff_name,
    pr.product_name,
    pr.product_code,
    mr.record_title,
    mr.scheduled_date,
    mt.task_id,
    mt.task_title,
    mt.priority,
    mt.status             AS task_status,
    mt.due_date,
    mt.completed_at
FROM maintenance_tasks mt
JOIN maintenance_profiles mp  ON mp.maintenance_id = mt.maintenance_id
JOIN users                u   ON u.user_id          = mp.maintenance_id
JOIN maintenance_records  mr  ON mr.record_id        = mt.record_id
JOIN products             pr  ON pr.product_id       = mr.product_id
ORDER BY mt.priority DESC, mt.due_date;

-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE TABLE audit_log (
    log_id      BIGSERIAL    PRIMARY KEY,
    actor_id    UUID         REFERENCES users(user_id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,
    table_name  VARCHAR(100) NOT NULL,
    record_id   TEXT,
    old_data    JSONB,
    new_data    JSONB,
    logged_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_table ON audit_log(table_name);
CREATE INDEX idx_audit_time  ON audit_log(logged_at);

-- ============================================================
-- FIX #5: updated_at TRIGGER
-- Automatically stamps updated_at on every UPDATE.
-- Applied to: users, products, projects, maintenance_records,
--             maintenance_tasks.
-- ============================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_maintenance_records_updated_at
    BEFORE UPDATE ON maintenance_records
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_maintenance_tasks_updated_at
    BEFORE UPDATE ON maintenance_tasks
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- FIX #6: ROW-LEVEL SECURITY (RLS)
-- Prevents cross-role data leakage at the database level.
-- The app must SET LOCAL app.current_user_id = '<uuid>' and
-- SET LOCAL app.current_role = '<role>' at the start of each
-- request (e.g. in a transaction or session variable).
-- ============================================================

-- Enable RLS on sensitive tables
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE designer_projects   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tasks   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log           ENABLE ROW LEVEL SECURITY;

-- Helper: get the current session user id (set by application on login)
-- Usage in app:  SET LOCAL app.current_user_id = '<uuid>';
--                SET LOCAL app.current_role     = 'Sales';

-- ── users table ──
-- Admins see all non-admin users.
-- Non-admin users see only their own row.
CREATE POLICY pol_users_admin ON users
    FOR SELECT
    USING (
        current_setting('app.current_role', true) = 'Admin'
        AND role_id != (SELECT role_id FROM roles WHERE role_name = 'Admin')
    );

CREATE POLICY pol_users_self ON users
    FOR SELECT
    USING (
        user_id = current_setting('app.current_user_id', true)::uuid
    );

-- ── designer_projects ──
-- Designers only see their own project assignments.
-- Admins see all.
CREATE POLICY pol_designer_projects_own ON designer_projects
    FOR SELECT
    USING (
        current_setting('app.current_role', true) = 'Admin'
        OR designer_id = current_setting('app.current_user_id', true)::uuid
    );

-- ── sales_products ──
-- Sales users only see their own product assignments.
-- Admins see all.
CREATE POLICY pol_sales_products_own ON sales_products
    FOR SELECT
    USING (
        current_setting('app.current_role', true) = 'Admin'
        OR sales_id = current_setting('app.current_user_id', true)::uuid
    );

-- ── sales_opportunities ──
-- Sales users only see their own opportunities.
-- Admins see all.
CREATE POLICY pol_sales_opportunities_own ON sales_opportunities
    FOR SELECT
    USING (
        current_setting('app.current_role', true) = 'Admin'
        OR sales_id = current_setting('app.current_user_id', true)::uuid
    );

-- ── maintenance_tasks ──
-- Maintenance staff only see tasks assigned to them.
-- Admins see all.
CREATE POLICY pol_maintenance_tasks_own ON maintenance_tasks
    FOR SELECT
    USING (
        current_setting('app.current_role', true) = 'Admin'
        OR maintenance_id = current_setting('app.current_user_id', true)::uuid
    );

-- ── audit_log ──
-- Only admins can read the audit log.
CREATE POLICY pol_audit_log_admin ON audit_log
    FOR SELECT
    USING (
        current_setting('app.current_role', true) = 'Admin'
    );

-- ============================================================
-- SEED DATA — Roles & Permissions
-- ============================================================

INSERT INTO roles (role_name, description) VALUES
    ('Admin',       'Full system access; manages users across all non-admin roles'),
    ('Sales',       'Manages product sales assignments and opportunities'),
    ('Designer',    'Works on design projects within assigned teams'),
    ('Maintenance', 'Handles product maintenance records and tasks');

INSERT INTO permissions (permission_key, description) VALUES
    ('user.read',               'View user list (non-admin only for Admin role)'),
    ('user.write',              'Create and update user accounts'),
    ('user.delete',             'Deactivate or remove users'),
    ('project.read',            'View projects'),
    ('project.write',           'Create and update projects'),
    ('product.read',            'View product catalogue'),
    ('product.write',           'Create and update products'),
    ('sales.read',              'View own sales assignments and opportunities'),
    ('sales.read.all',          'View all sales assignments (Admin only)'),
    ('sales.write',             'Manage own sales assignments'),
    ('maintenance.read',        'View own maintenance records and tasks'),
    ('maintenance.read.all',    'View all maintenance records (Admin only)'),
    ('maintenance.write',       'Create and update own maintenance records/tasks'),
    ('designer.read',           'View own designer profiles and assignments'),
    ('designer.read.all',       'View all designer profiles (Admin only)'),
    ('designer.write',          'Manage own designer-project assignments');

-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r, permissions p
WHERE r.role_name = 'Admin';

-- Sales permissions (own data only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key IN (
    'product.read', 'sales.read', 'sales.write'
)
WHERE r.role_name = 'Sales';

-- Designer permissions (own data only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key IN (
    'project.read', 'project.write', 'designer.read', 'designer.write'
)
WHERE r.role_name = 'Designer';

-- Maintenance permissions (own data only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM roles r
JOIN permissions p ON p.permission_key IN (
    'product.read', 'maintenance.read', 'maintenance.write'
)
WHERE r.role_name = 'Maintenance';

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Check if a user has a specific permission
CREATE OR REPLACE FUNCTION has_permission(p_user_id UUID, p_permission_key VARCHAR)
RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1
        FROM users u
        JOIN role_permissions rp ON rp.role_id      = u.role_id
        JOIN permissions      p  ON p.permission_id  = rp.permission_id
        WHERE u.user_id        = p_user_id
          AND p.permission_key = p_permission_key
          AND u.is_active      = TRUE
    );
$$;

-- Get the role name for a given user
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS user_role
LANGUAGE sql STABLE AS $$
    SELECT r.role_name
    FROM users u
    JOIN roles r ON r.role_id = u.role_id
    WHERE u.user_id = p_user_id
      AND u.is_active = TRUE;
$$;
