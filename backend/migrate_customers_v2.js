const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    console.log('Altering customers table...');
    
    await pool.query(`
      ALTER TABLE customers 
      RENAME COLUMN company_site_location TO customer_site_location;

      ALTER TABLE customers
      DROP COLUMN IF EXISTS contact_person_name,
      DROP COLUMN IF EXISTS mobile_no;

      ALTER TABLE customers
      ADD COLUMN IF NOT EXISTS technical_contact_person VARCHAR(255),
      ADD COLUMN IF NOT EXISTS technical_contact_mobile VARCHAR(20),
      ADD COLUMN IF NOT EXISTS accounts_contact_person VARCHAR(255),
      ADD COLUMN IF NOT EXISTS accounts_contact_mobile VARCHAR(20),
      ADD COLUMN IF NOT EXISTS udyam_aadhar_no VARCHAR(100);
    `);

    console.log('Customers table altered successfully.');
  } catch (err) {
    console.error('MIGRATION ERROR:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
