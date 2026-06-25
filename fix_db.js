const pool = require('./backend/src/config/db');

async function fix() {
    try {
        await pool.query('ALTER TABLE hr_lms_modules ALTER COLUMN duration_hours TYPE NUMERIC(5,2) USING duration_hours::numeric;');
        console.log("Fixed duration_hours to NUMERIC");
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
fix();
