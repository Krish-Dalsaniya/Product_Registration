const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function query() {
  const client = await pool.connect();
  try {
    const pcbs = await client.query('SELECT pcb_id, part_no, stock_quantity FROM pcb_master');
    console.log('--- PCBs ---');
    console.log(pcbs.rows);

    const electrical = await client.query('SELECT part_id, part_name, part_number, stock_quantity FROM electrical_part_master');
    console.log('--- Electrical ---');
    console.log(electrical.rows);

    const electronics = await client.query('SELECT part_id, part_name, part_number, stock_quantity FROM electronics_part_master');
    console.log('--- Electronics ---');
    console.log(electronics.rows);

    const structural = await client.query('SELECT part_id, part_name, part_number, stock_quantity FROM structural_part_master');
    console.log('--- Structural ---');
    console.log(structural.rows);
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    pool.end();
  }
}

query();
