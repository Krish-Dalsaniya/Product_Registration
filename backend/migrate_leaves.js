const pool = require('./src/config/db');

async function run() {
  try {
    console.log('Altering leave_requests table...');
    await pool.query(`
      ALTER TABLE leave_requests 
      ADD COLUMN IF NOT EXISTS is_half_day BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS half_day_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS attachment_url TEXT;
    `);
    
    console.log('Altering leave_balances table...');
    await pool.query(`
      ALTER TABLE leave_balances 
      ALTER COLUMN total_days TYPE NUMERIC(5,1),
      ALTER COLUMN used_days TYPE NUMERIC(5,1);
    `);
    
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit();
  }
}

run();
