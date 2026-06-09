const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const client = await pool.connect();
  try {
    const fgCount = await client.query('SELECT COUNT(*) FROM finished_goods');
    console.log('Current Finished Goods count:', fgCount.rows[0].count);

    // Let's get one product to insert a test finished good if count is 0
    if (parseInt(fgCount.rows[0].count) === 0) {
      const prodResult = await client.query('SELECT product_id FROM products LIMIT 1');
      if (prodResult.rows.length > 0) {
        const prodId = prodResult.rows[0].product_id;
        console.log('Inserting test finished good for product_id:', prodId);
        const insertRes = await client.query('INSERT INTO finished_goods (product_id, quantity) VALUES ($1, 1) RETURNING id', [prodId]);
        const fgId = insertRes.rows[0].id;
        await client.query('INSERT INTO finished_goods_serials (finished_good_id, serial_number) VALUES ($1, $2)', [fgId, `TEST-SERIAL-${Date.now()}`]);
        console.log('Test finished good inserted!');
      } else {
        console.log('No products found to insert test finished good.');
      }
    } else {
      const allFG = await client.query('SELECT fg.id, p.product_name, fg.quantity FROM finished_goods fg JOIN products p ON fg.product_id = p.product_id');
      console.log('Existing Finished Goods:', allFG.rows);
    }
  } catch (err) {
    console.error('Error querying finished goods:', err);
  } finally {
    client.release();
    pool.end();
  }
}

check();
