require('dotenv').config({ path: './.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE pms_closure_items
      ADD COLUMN task_id UUID REFERENCES pms_tasks(task_id) ON DELETE SET NULL;
    `);
    console.log('Successfully added task_id to pms_closure_items');
  } catch (err) {
    if (err.code === '42701') {
      console.log('Column task_id already exists');
    } else {
      console.error('Migration failed:', err);
    }
  } finally {
    pool.end();
  }
}
migrate();
