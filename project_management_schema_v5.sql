-- ============================================================
-- DATABASE SCHEMA: LIPL PRODUCT REGISTRATION & ASSET MANAGEMENT
-- VERSION: 5.0
-- UPDATED: 2026-04-30
-- ============================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ROLES & PERMISSIONS
CREATE TABLE roles (
    role_id     SERIAL      PRIMARY KEY,
    role_name   VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE permissions (
    permission_id  SERIAL       PRIMARY KEY,
    permission_key VARCHAR(100) NOT NULL UNIQUE,
    description    TEXT
);

CREATE TABLE role_permissions (
    role_id       INT NOT NULL REFERENCES roles(role_id)       ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 3. CLASSIFICATION SYSTEM
CREATE TABLE product_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_sub_categories (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES product_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_id, name)
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

-- 5. PRODUCTS (Updated for Multi-Asset Management)
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
    image_url       TEXT,           -- Legacy: Stores primary image
    document_url    TEXT,           -- Legacy: Stores primary document
    images          JSONB        DEFAULT '[]'::JSONB, -- New: Multi-image array
    documents       JSONB        DEFAULT '[]'::JSONB, -- New: Multi-document array
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 6. DESIGNER DOMAIN
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

-- 7. PROJECTS & ASSIGNMENTS
CREATE TABLE projects (
    project_id    SERIAL         PRIMARY KEY,
    team_id       INT            REFERENCES teams(team_id)    ON DELETE SET NULL,
    product_id    INT            REFERENCES products(product_id) ON DELETE SET NULL,
    project_name  VARCHAR(200)   NOT NULL,
    status        VARCHAR(50)    DEFAULT 'Planning',
    start_date    DATE,
    end_date      DATE,
    created_at    TIMESTAMPTZ    DEFAULT NOW()
);

-- ============================================================
-- VIEWS & UTILITIES
-- ============================================================

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
-- SEED DATA (INITIAL SETUP)
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

-- Seed initial admin (Password: Admin@123)
-- Note: You should update this with a properly hashed password in production
INSERT INTO users (role_id, full_name, email, password_hash)
SELECT role_id, 'System Administrator', 'admin@lipl.in', '$2b$10$K7Z.uW9B/Z9r3/vJ5B/8u.fF8i1C6K7Z.uW9B/Z9r3/vJ5B/8u'
FROM roles WHERE role_name = 'Admin';
