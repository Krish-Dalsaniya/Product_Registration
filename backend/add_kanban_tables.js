require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS hr_candidate_comments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                candidate_id UUID REFERENCES hr_candidates(id) ON DELETE CASCADE,
                author_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
                body TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS hr_candidate_activity_log (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                candidate_id UUID REFERENCES hr_candidates(id) ON DELETE CASCADE,
                actor_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
                action_type VARCHAR(50) NOT NULL,
                details JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE hr_candidates ADD COLUMN IF NOT EXISTS kanban_order FLOAT DEFAULT 0;
            
            UPDATE hr_candidates SET kanban_order = EXTRACT(EPOCH FROM created_at) WHERE kanban_order = 0 OR kanban_order IS NULL;
        `);
        console.log('Successfully created tables and added kanban_order');
    } catch(e) {
        console.error('Error:', e);
    } finally {
        pool.end();
    }
}
run();
