const { pool } = require('../../src/config/db');
const fs = require('fs');
const path = require('path');

async function up() {
  try {
    console.log('Adding user_id to hr_trainees table...');
    
    const sql = `
ALTER TABLE hr_trainees 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(user_id) ON DELETE SET NULL;
`;

    await pool.query(sql);
    console.log('user_id added successfully.');

    // Log the migration
    const migrationFilePath = path.join(__dirname, '..', '..', 'database.sql');
    if (fs.existsSync(migrationFilePath)) {
      fs.appendFileSync(migrationFilePath, '\n-- Adding user_id to hr_trainees\n' + sql + '\n');
    }
  } catch (error) {
    console.error('Error adding user_id to hr_trainees:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

up();
