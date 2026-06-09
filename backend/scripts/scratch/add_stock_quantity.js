const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running stock_quantity migration...');
    await client.query(`
      ALTER TABLE electrical_part_master 
      ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
    `);
    console.log('✓ electrical_part_master');

    await client.query(`
      ALTER TABLE electronics_part_master 
      ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
    `);
    console.log('✓ electronics_part_master');

    await client.query(`
      ALTER TABLE structural_part_master 
      ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
    `);
    console.log('✓ structural_part_master');

    await client.query(`
      ALTER TABLE pcb_master 
      ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;
    `);
    console.log('✓ pcb_master');

    console.log('\nMigration complete!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
