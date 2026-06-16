const { pool } = require('./src/config/db');

async function migrate() {
  try {
    await pool.query("UPDATE leave_balances SET leave_type = 'Paid Leave' WHERE leave_type = 'PTO'");
    await pool.query("UPDATE leave_requests SET leave_type = 'Paid Leave' WHERE leave_type = 'PTO'");
    
    await pool.query("UPDATE leave_balances SET leave_type = 'Emergency Leave' WHERE leave_type = 'Personal'");
    await pool.query("UPDATE leave_requests SET leave_type = 'Emergency Leave' WHERE leave_type = 'Personal'");
    
    console.log("Migration complete.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrate();
