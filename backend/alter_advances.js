const db = require('./src/config/db');

async function alterTable() {
    try {
        await db.query(`ALTER TABLE hr_advances ADD COLUMN IF NOT EXISTS months_paid INT DEFAULT 0`);
        console.log('Successfully altered hr_advances to add months_paid.');
    } catch (e) {
        console.error('Error altering table:', e.message);
    }
    process.exit(0);
}

alterTable();
