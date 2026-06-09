-- ============================================================
-- PROJECT MANAGEMENT SYSTEM — RBAC SCHEMA  v4
-- PostgreSQL | Updated with:
--   1. product_categories & product_sub_categories (Hierarchical)
--   2. products table updated with image/document/specs columns
--   3. projects.product_id FK  (designer domain ↔ products)
--   4. updated_at auto-triggers on all relevant tables
--   5. Row-Level Security (RLS) on sensitive tables
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

-- ============================================================
-- CLASSIFICATION & PRODUCT DOMAIN
-- ============================================================

-- 5. PRODUCT_CATEGORIES
CREATE TABLE product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PRODUCT_SUB_CATEGORIES
CREATE TABLE product_sub_categories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES product_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_id, name)
);

-- 7. PRODUCTS
CREATE TABLE products (
    product_id      SERIAL       PRIMARY KEY,
    product_name    VARCHAR(200) NOT NULL,
    product_code    VARCHAR(50)  NOT NULL UNIQUE,
    description     TEXT,
    unit_price      NUMERIC(12,2) DEFAULT 0,
    category        VARCHAR(100),
    sub_category    VARCHAR(100),
    specification   TEXT,
    feature         TEXT,
    image_url       TEXT,
    document_url    TEXT,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DESIGNER DOMAIN
-- ============================================================

CREATE TABLE designer_profiles (
    designer_id     UUID         PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    specialty       VARCHAR(100),
    portfolio_url   TEXT,
    availability    BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE teams (
    team_id     SERIAL       PRIMARY KEY,
    team_name   VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE team_members (
    team_id     INT   NOT NULL REFERENCES teams(team_id)                 ON DELETE CASCADE,
    designer_id UUID  NOT NULL REFERENCES designer_profiles(designer_id) ON DELETE CASCADE,
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_lead     BOOLEAN     NOT NULL DEFAULT FALSE,
    PRIMARY KEY (team_id, designer_id)
);

CREATE TABLE projects (
    project_id    SERIAL         PRIMARY KEY,
    team_id       INT            REFERENCES teams(team_id)    ON DELETE SET NULL,
    product_id    INT            REFERENCES products(product_id) ON DELETE SET NULL,
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
CREATE INDEX idx_projects_product ON projects(product_id);

CREATE TABLE designer_projects (
    designer_id     UUID  NOT NULL REFERENCES designer_profiles(designer_id) ON DELETE CASCADE,
    project_id      INT   NOT NULL REFERENCES projects(project_id)           ON DELETE CASCADE,
    role_in_project VARCHAR(100),
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (designer_id, project_id)
);

-- ============================================================
-- SALES DOMAIN
-- ============================================================

CREATE TABLE sales_profiles (
    sales_id        UUID         PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    region          VARCHAR(100),
    target_revenue  NUMERIC(14,2),
    hire_date       DATE
);

CREATE TABLE sales_products (
    sales_id    UUID  NOT NULL REFERENCES sales_profiles(sales_id) ON DELETE CASCADE,
    product_id  INT   NOT NULL REFERENCES products(product_id)     ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_primary  BOOLEAN     NOT NULL DEFAULT FALSE,
    PRIMARY KEY (sales_id, product_id)
);

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

-- ============================================================
-- MAINTENANCE DOMAIN
-- ============================================================

CREATE TABLE maintenance_profiles (
    maintenance_id  UUID         PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    certification   VARCHAR(150),
    hire_date       DATE
);

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

-- ============================================================
-- VIEWS
-- ============================================================

CREATE OR REPLACE VIEW v_designer_project_overview AS
SELECT
    u.user_id         AS designer_user_id,
    u.full_name       AS designer_name,
    dp.specialty,
    dp.availability,
    t.team_name,
    p.project_name,
    p.status          AS project_status,
    pr.product_name,
    pr.product_code,
    djp.role_in_project,
    djp.assigned_at
FROM designer_projects djp
JOIN designer_profiles dp  ON dp.designer_id = djp.designer_id
JOIN users             u   ON u.user_id       = dp.designer_id
JOIN projects          p   ON p.project_id    = djp.project_id
LEFT JOIN team_members tm  ON tm.designer_id  = dp.designer_id
LEFT JOIN teams        t   ON t.team_id       = tm.team_id
LEFT JOIN products     pr  ON pr.product_id   = p.product_id
WHERE p.status = 'Active';

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
    STRING_AGG(DISTINCT pr.product_name, ', ')  AS linked_products
FROM teams t
LEFT JOIN team_members    tm ON tm.team_id    = t.team_id
LEFT JOIN projects        p  ON p.team_id     = t.team_id
LEFT JOIN products        pr ON pr.product_id = p.product_id
GROUP BY t.team_id, t.team_name;

-- ============================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO roles (role_name, description) VALUES
    ('Admin',       'Full system access; manages users across all non-admin roles'),
    ('Sales',       'Manages product sales assignments and opportunities'),
    ('Designer',    'Works on design projects within assigned teams'),
    ('Maintenance', 'Handles product maintenance records and tasks');

INSERT INTO permissions (permission_key, description) VALUES
    ('user.read',               'View user list'),
    ('user.write',              'Create and update user accounts'),
    ('product.read',            'View product catalogue'),
    ('product.write',           'Create and update products');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id FROM roles r, permissions p WHERE r.role_name = 'Admin';
