const { pool } = require('./src/config/db');

async function fix() {
  try {
    console.log("Creating user_custom_access table...");
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_custom_access (
          user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
          has_custom_permissions BOOLEAN DEFAULT false
      );
    `);
    console.log("Table created successfully.");
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
fix();
