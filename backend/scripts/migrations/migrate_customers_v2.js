const db = require('./src/config/db');

async function migrate() {
  try {
    await db.query(`
      ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS technical_contacts JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS sales_contacts JSONB DEFAULT '[]'
    `);
    console.log("Migration successful");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
