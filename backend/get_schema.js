const db = require('./src/config/db');

async function getSchema() {
  const res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'hr_employees'");
  console.log(res.rows);
  process.exit(0);
}
getSchema();
