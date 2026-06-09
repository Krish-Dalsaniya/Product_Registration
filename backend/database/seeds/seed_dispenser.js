const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function seedDispenser() {
  try {
    console.log('Seeding Dispenser category...');
    
    // Create 'Dispenser' category
    const catRes = await pool.query(
      'INSERT INTO product_categories (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
      ['Dispenser']
    );
    const catId = catRes.rows[0].id;

    // Create 'Dispenser' sub-category under 'Dispenser' category
    await pool.query(
      'INSERT INTO product_sub_categories (category_id, name) VALUES ($1, $2) ON CONFLICT (category_id, name) DO NOTHING',
      [catId, 'Dispenser']
    );

    console.log('Dispenser category and sub-category seeded successfully!');
  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await pool.end();
  }
}

seedDispenser();
