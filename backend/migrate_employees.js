const db = require('./src/config/db');

async function run() {
    try {
        const employees = await db.query('SELECT employee_id, date_of_joining FROM hr_employees');
        for (const e of employees.rows) {
            try {
                await db.query('INSERT INTO hr_onboarding (employee_id, offer_acceptance_date) VALUES ($1, $2) ON CONFLICT DO NOTHING', [e.employee_id, e.date_of_joining]);
                console.log(`Inserted employee_id ${e.employee_id}`);
            } catch(err) {
                console.error(`Failed to insert ${e.employee_id}: ${err.message}`);
            }
        }
        console.log('Done migrating employees to onboarding');
        
        const count = await db.query('SELECT COUNT(*) FROM hr_onboarding');
        console.log('Total hr_onboarding records:', count.rows[0].count);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
