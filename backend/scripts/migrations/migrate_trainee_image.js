const { pool } = require('../../src/config/db');
const fs = require('fs');
const path = require('path');

async function up() {
  try {
    console.log('Adding image_url to hr_trainees table...');
    
    const sql = `
ALTER TABLE hr_trainees ADD COLUMN IF NOT EXISTS image_url TEXT;
`;

    await pool.query(sql);
    console.log('Added image_url column successfully.');
    
    const migrationFilePath = path.join(__dirname, '../../database/migration.sql');
    fs.appendFileSync(migrationFilePath, '\n-- Adding image_url to hr_trainees\n' + sql + '\n');
    console.log('Appended to migration.sql');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

up();
