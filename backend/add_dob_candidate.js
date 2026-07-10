const pool = require('./src/config/db');

async function migrate() {
    try {
        console.log('Starting migration...');
        
        await pool.query(`
            ALTER TABLE hr_candidates ADD COLUMN IF NOT EXISTS date_of_birth DATE;
        `);
        console.log('Successfully added date_of_birth to hr_candidates table');
        
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
