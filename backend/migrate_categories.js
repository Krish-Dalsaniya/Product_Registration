const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    console.log('Starting category migration...');
    
    // Categories Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sub-Categories Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_sub_categories (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES product_categories(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category_id, name)
      )
    `);

    // Add missing columns to products table
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS sub_category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS specification TEXT,
      ADD COLUMN IF NOT EXISTS feature TEXT,
      ADD COLUMN IF NOT EXISTS image_url TEXT,
      ADD COLUMN IF NOT EXISTS document_url TEXT,
      ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]';
    `);

    // Seed some initial data if empty
    const catCheck = await pool.query('SELECT COUNT(*) FROM product_categories');
    if (parseInt(catCheck.rows[0].count) === 0) {
      const cats = ['Controllers & Processors', 'IC', 'PCB', 'Thermal Printers', 'Dispenser'];
      for (const cat of cats) {
        const res = await pool.query('INSERT INTO product_categories (name) VALUES ($1) RETURNING id', [cat]);
        const catId = res.rows[0].id;
        
        if (cat === 'IC') {
          const subCats = ['1-Wire ID', 'ADC', 'Battery Charger', 'Bluetooth'];
          for (const sub of subCats) {
            await pool.query('INSERT INTO product_sub_categories (category_id, name) VALUES ($1, $2)', [catId, sub]);
          }
        }
        if (cat === 'Dispenser') {
          await pool.query('INSERT INTO product_sub_categories (category_id, name) VALUES ($1, $2)', [catId, 'Dispenser']);
        }
      }
      console.log('Seeded initial categories.');
    }

    console.log('Category migration completed successfully.');
  } catch (err) {
    console.error('MIGRATION ERROR:', err.message);
    throw err; // Re-throw to handle in server startup
  } finally {
    await pool.end();
  }
}

// Only run immediately if this file is executed directly
if (require.main === module) {
  migrate().catch(err => {
    console.error('Immediate migration failed:', err);
    process.exit(1);
  });
}

module.exports = migrate;
