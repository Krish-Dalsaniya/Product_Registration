const db = require('../src/config/db');

async function checkColumns() {
  try {
    const res = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customers'
    `);
    console.log('--- CUSTOMERS COLUMNS ---');
    res.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkColumns();
