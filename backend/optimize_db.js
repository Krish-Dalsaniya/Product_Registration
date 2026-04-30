const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runOptimization() {
  const sql = fs.readFileSync(path.join(__dirname, 'add_indexes.sql'), 'utf8');
  try {
    console.log('Applying database indexes...');
    await pool.query(sql);
    console.log('Database indexes applied successfully!');
  } catch (err) {
    console.error('Error applying indexes:', err);
  } finally {
    await pool.end();
  }
}

runOptimization();
