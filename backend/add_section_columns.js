const { pool } = require('./src/config/db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("ALTER TABLE form_sections ADD COLUMN IF NOT EXISTS section_type VARCHAR(50) DEFAULT 'mixed';");
    await client.query("ALTER TABLE form_sections ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;");
    console.log("Successfully added section_type and config to form_sections");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
