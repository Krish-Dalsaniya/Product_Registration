const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    console.log('Starting customers table migration...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_code VARCHAR(50) UNIQUE NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        company_address TEXT,
        company_site_location TEXT,
        contact_person_name VARCHAR(255),
        mobile_no VARCHAR(20),
        email VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        pincode VARCHAR(20),
        gst_no VARCHAR(50),
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Customers table created successfully.');
  } catch (err) {
    console.error('MIGRATION ERROR:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
