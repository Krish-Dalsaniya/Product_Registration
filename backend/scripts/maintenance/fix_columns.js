const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://postgres:root@localhost:5432/product_registration'
});
async function migrate() {
  try {
    await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100), ADD COLUMN IF NOT EXISTS sub_category VARCHAR(100), ADD COLUMN IF NOT EXISTS specification TEXT, ADD COLUMN IF NOT EXISTS feature TEXT, ADD COLUMN IF NOT EXISTS image_url TEXT, ADD COLUMN IF NOT EXISTS document_url TEXT;");
    console.log('Migration Success!');
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
migrate();
