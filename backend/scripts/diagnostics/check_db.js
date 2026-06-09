const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/product_registration',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function check() {
  try {
    await client.connect();
    const products = await client.query('SELECT COUNT(*) FROM products');
    const customers = await client.query('SELECT COUNT(*) FROM customers');
    console.log('Products:', products.rows[0].count);
    console.log('Customers:', customers.rows[0].count);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

check();
