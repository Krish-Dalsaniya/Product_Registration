const fs = require('fs');
const db = require('./src/config/db');

async function runMigration() {
  try {
    const sql = fs.readFileSync('electronics_migration.sql', 'utf8');
    console.log('Running migration...');
    await db.query(sql);
    console.log('Migration successful!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
