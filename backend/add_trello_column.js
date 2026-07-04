require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function run() {
    try {
        await pool.query(`ALTER TABLE hr_candidates ADD COLUMN IF NOT EXISTS trello_metadata JSONB DEFAULT '{}'::jsonb`);
        console.log('Successfully added column');
    } catch(e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
run();
