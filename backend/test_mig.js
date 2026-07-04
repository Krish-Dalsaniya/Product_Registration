const db = require('./src/config/db');

async function run() {
    try {
        const trainees = await db.query('SELECT trainee_id, joining_date FROM hr_trainees');
        for (const t of trainees.rows) {
            try {
                await db.query('INSERT INTO hr_onboarding (trainee_id, offer_acceptance_date) VALUES ($1, $2)', [t.trainee_id, t.joining_date]);
                console.log(`Inserted trainee_id ${t.trainee_id}`);
            } catch(e) {
                console.error(`Failed to insert ${t.trainee_id}: ${e.message}`);
            }
        }
        console.log('Done migrating trainees to onboarding');
        
        const count = await db.query('SELECT COUNT(*) FROM hr_onboarding');
        console.log('Total hr_onboarding records:', count.rows[0].count);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
