const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, 'database', 'migrations', 'audit_logs.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log('Running audit logs migration...');
    await pool.query(sql);
    console.log('Migration successful.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    pool.end();
  }
}

runMigration();
