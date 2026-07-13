const pool = require('../src/config/db');

async function migrate() {
    try {
        console.log('Adding Git metadata to pms_projects...');
        await pool.query(`
            ALTER TABLE pms_projects 
            ADD COLUMN IF NOT EXISTS repository_owner VARCHAR(255),
            ADD COLUMN IF NOT EXISTS repository_name VARCHAR(255);
        `);
        console.log('Migration successful.');
        process.exit(0);
    } catch (e) {
        console.error('Migration failed', e);
        process.exit(1);
    }
}
migrate();
