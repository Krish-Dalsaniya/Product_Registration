const db = require('./src/config/db');

async function run() {
    try {
        await db.query('TRUNCATE TABLE hr_onboarding RESTART IDENTITY CASCADE');
        console.log('Truncated hr_onboarding');
        
        const schema = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'hr_onboarding'");
        console.log('Schema:', schema.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
