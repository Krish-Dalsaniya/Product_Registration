const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const res = await pool.query(`
    SELECT r.role_name as department, u.designation, COUNT(u.user_id) as count 
    FROM users u 
    JOIN roles r ON u.role_id = r.role_id 
    WHERE u.is_active = TRUE 
    GROUP BY r.role_name, u.designation;
  `);
  console.log(res.rows);
  process.exit();
}
run();
