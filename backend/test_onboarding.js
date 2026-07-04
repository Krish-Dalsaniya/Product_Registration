const db = require('./src/config/db');

async function run() {
    try {
        const result = await db.query(`
            SELECT o.*, 
                   COALESCE(e.emp_code, t.trainee_code) as emp_code, 
                   COALESCE(e.department_id, t.department_id) as department_id, 
                   e.designation_id,
                   COALESCE(u.full_name, t.first_name || ' ' || t.last_name) as full_name, 
                   COALESCE(u.email, t.email) as email, 
                   COALESCE(u.image_url, t.image_url) as image_url,
                   CASE WHEN o.employee_id IS NOT NULL THEN 'Employee' ELSE 'Trainee' END as type
            FROM hr_onboarding o
            LEFT JOIN hr_employees e ON o.employee_id = e.employee_id
            LEFT JOIN hr_trainees t ON o.trainee_id = t.trainee_id
            LEFT JOIN users u ON e.user_id = u.user_id OR t.user_id = u.user_id
            ORDER BY o.created_at DESC
        `);
        console.log("Records length:", result.rows.length);
        console.log(result.rows);
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
run();
