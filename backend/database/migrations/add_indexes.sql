-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Optimize User searches and joins
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
-- Case-insensitive search on email
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
-- Name searching with trigram for faster partial matches
CREATE INDEX IF NOT EXISTS idx_users_full_name_trgm ON users USING gin (full_name gin_trgm_ops);

-- Optimize team membership lookups
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Optimize project status filtering
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
