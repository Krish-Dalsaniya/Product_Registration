const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function runMigration() {
  try {
    console.log('Connecting to database...');
    const sqlPath = path.join(__dirname, 'database', 'migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running migration...');
    await pool.query(sql);
    console.log('Migration successful.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
