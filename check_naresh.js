const db = require('./backend/config/db');

async function checkNaresh() {
  try {
    const res = await db.query(`
      SELECT u.user_id, u.full_name, r.role_name, e.employee_id 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN hr_employees e ON u.user_id = e.user_id
      WHERE u.full_name ILIKE '%naresh%'
    `);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

checkNaresh();
