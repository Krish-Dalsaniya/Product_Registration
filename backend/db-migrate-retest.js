const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

const runMigration = async () => {
    try {
        await pool.query("ALTER TABLE hr_lms_assignments ADD COLUMN IF NOT EXISTS retest_requested BOOLEAN DEFAULT FALSE;");
        await pool.query("ALTER TABLE hr_lms_assignments ADD COLUMN IF NOT EXISTS retest_approved BOOLEAN DEFAULT FALSE;");
        console.log("Migration successful");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed", e);
        process.exit(1);
    }
}
runMigration();
