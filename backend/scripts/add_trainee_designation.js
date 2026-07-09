const db = require('../src/config/db');

async function migrate() {
    try {
        await db.query(`ALTER TABLE hr_trainees ADD COLUMN IF NOT EXISTS designation_id UUID REFERENCES hr_designations(designation_id) ON DELETE SET NULL;`);
        console.log('Migration successful: Added designation_id to hr_trainees.');
    } catch (e) {
        console.error('Migration failed:', e.message);
    } finally {
        process.exit();
    }
}

migrate();
