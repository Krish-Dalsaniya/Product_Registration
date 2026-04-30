const { Pool } = require('pg');
require('dotenv').config();

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

    // Seed some initial data if empty
    const catCheck = await pool.query('SELECT COUNT(*) FROM product_categories');
    if (parseInt(catCheck.rows[0].count) === 0) {
      const cats = ['Controllers & Processors', 'IC', 'PCB', 'Thermal Printers'];
      for (const cat of cats) {
        const res = await pool.query('INSERT INTO product_categories (name) VALUES ($1) RETURNING id', [cat]);
        const catId = res.rows[0].id;
        
        if (cat === 'IC') {
          const subCats = ['1-Wire ID', 'ADC', 'Battery Charger', 'Bluetooth'];
          for (const sub of subCats) {
            await pool.query('INSERT INTO product_sub_categories (category_id, name) VALUES ($1, $2)', [catId, sub]);
          }
        }
      }
      console.log('Seeded initial categories.');
    }

    console.log('Category migration completed.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
