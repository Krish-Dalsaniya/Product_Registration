const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    console.log('Starting company migration...');
    
    // Companies Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sub-Companies Table (Divisions/Departments)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_sub_companies (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES product_companies(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, name)
      )
    `);

    // Ensure products table has company_name and sub_company columns
    await pool.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS sub_company VARCHAR(255)
    `);

    // Seed some initial data if empty
    const compCheck = await pool.query('SELECT COUNT(*) FROM product_companies');
    if (parseInt(compCheck.rows[0].count) === 0) {
      // Try to get unique company names from existing products
      const existingCompanies = await pool.query('SELECT DISTINCT company_name FROM products WHERE company_name IS NOT NULL AND company_name != \'\'');
      
      const companiesToSeed = existingCompanies.rows.map(r => r.company_name);

      for (const comp of companiesToSeed) {
        await pool.query('INSERT INTO product_companies (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [comp]);
      }
      console.log(`Seeded ${companiesToSeed.length} initial companies.`);
    }

    console.log('Company migration completed successfully.');
  } catch (err) {
    console.error('MIGRATION ERROR:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrate().catch(err => {
    console.error('Immediate migration failed:', err);
    process.exit(1);
  });
}

module.exports = migrate;
