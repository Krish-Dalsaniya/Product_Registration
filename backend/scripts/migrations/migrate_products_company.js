const db = require('./src/config/db');

async function migrate() {
  try {
    await db.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS company_name VARCHAR(255)
    `);
    console.log("Migration successful");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrate();
