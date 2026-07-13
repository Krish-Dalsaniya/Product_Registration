const pool = require('../src/config/db');

async function migrate() {
    try {
        console.log('Adding Git metadata to finished_goods...');
        await pool.query(`
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
        `);
        console.log('Migration successful.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed', e);
        process.exit(1);
    }
}
migrate();
