require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const runMigration = async () => {
  try {
    const sql = `
CREATE TABLE IF NOT EXISTS pms_sprints (
    sprint_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES pms_projects(project_id) ON DELETE CASCADE,
    sprint_name VARCHAR(255) NOT NULL,
    goal TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'Planning', 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE pms_tasks ADD COLUMN IF NOT EXISTS sprint_id UUID REFERENCES pms_sprints(sprint_id) ON DELETE SET NULL;
ALTER TABLE pms_tasks ADD COLUMN IF NOT EXISTS story_points INTEGER DEFAULT 0;
    `;
    await pool.query(sql);
    console.log('Sprint Migration successful');
  } catch (error) {
    console.error('Sprint Migration failed:', error);
  } finally {
    pool.end();
  }
};

runMigration();
