const db = require('./src/config/db');

async function backfillOnboarding() {
  try {
    console.log('Backfilling onboarding records for existing employees...');
    const employees = await db.query(`
        SELECT employee_id FROM hr_employees 
        WHERE employee_id NOT IN (SELECT employee_id FROM hr_onboarding)
    `);

    let count = 0;
    for (const emp of employees.rows) {
        await db.query(`
            INSERT INTO hr_onboarding (employee_id, status) VALUES ($1, 'Pending')
        `, [emp.employee_id]);
        count++;
    }

    console.log(`Successfully added ${count} employees to the Onboarding Kanban board.`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

backfillOnboarding();
