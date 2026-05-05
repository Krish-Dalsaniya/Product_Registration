const db = require('./src/config/db');

async function migrate() {
  try {
    await db.query(`
      ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS company_type VARCHAR(255)
    `);
    console.log("Migration successful: Added company_type column");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
