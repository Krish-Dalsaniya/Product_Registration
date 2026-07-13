const db = require('./src/config/db');
async function migrate() {
    try {
        await db.query(`ALTER TABLE hr_lms_assignments ADD COLUMN IF NOT EXISTS extension_reason TEXT;`);
        console.log('Successfully added extension_reason to hr_lms_assignments');
        process.exit(0);
    } catch(e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}
migrate();
