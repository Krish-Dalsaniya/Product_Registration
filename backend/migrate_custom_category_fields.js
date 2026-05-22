/**
 * Migration: Custom Category Fields
 * Creates the inventory_custom_category_fields table and adds
 * custom_params JSONB columns to the three inventory master tables.
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create the custom category fields metadata table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_custom_category_fields (
        id            SERIAL PRIMARY KEY,
        module        VARCHAR(50) NOT NULL,        -- 'electrical' | 'electronics' | 'structural'
        category_name VARCHAR(255) NOT NULL,
        fields        JSONB NOT NULL DEFAULT '[]', -- array of { label, key }
        created_at    TIMESTAMP DEFAULT NOW(),
        updated_at    TIMESTAMP DEFAULT NOW(),
        UNIQUE (module, category_name)
      );
    `);
    console.log('✅ Created inventory_custom_category_fields table');

    // 2. Add custom_params to electrical_part_master
    await client.query(`
      ALTER TABLE electrical_part_master
        ADD COLUMN IF NOT EXISTS custom_params JSONB DEFAULT '{}';
    `);
    console.log('✅ Added custom_params to electrical_part_master');

    // 3. Add custom_params to ELECTRONICS_PART_MASTER
    await client.query(`
      ALTER TABLE electronics_part_master
        ADD COLUMN IF NOT EXISTS custom_params JSONB DEFAULT '{}';
    `);
    console.log('✅ Added custom_params to electronics_part_master');

    // 4. Add custom_params to structural_part_master
    await client.query(`
      ALTER TABLE structural_part_master
        ADD COLUMN IF NOT EXISTS custom_params JSONB DEFAULT '{}';
    `);
    console.log('✅ Added custom_params to structural_part_master');

    await client.query('COMMIT');
    console.log('✅ Migration complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

run();
