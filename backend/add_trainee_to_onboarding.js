const db = require('./src/config/db');

async function run() {
    try {
        await db.query(`ALTER TABLE hr_onboarding ALTER COLUMN employee_id DROP NOT NULL`);
        await db.query(`ALTER TABLE hr_onboarding ADD COLUMN IF NOT EXISTS trainee_id UUID REFERENCES hr_trainees(trainee_id) ON DELETE CASCADE`);
        console.log('Schema updated successfully.');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
