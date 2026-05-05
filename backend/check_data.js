const db = require('./src/config/db');

async function check() {
  try {
    const result = await db.query('SELECT customer_id, company_name, company_type FROM customers ORDER BY updated_at DESC LIMIT 5');
    console.log(result.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
