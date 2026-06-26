const db = require('./src/config/db');

async function checkNaresh() {
  try {
    const res = await db.query(`
      SELECT user_id, full_name, is_active FROM users WHERE full_name ILIKE '%naresh%'
    `);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkNaresh();
