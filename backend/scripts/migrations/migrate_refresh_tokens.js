const db = require('./src/config/db');

const migrate = async () => {
  try {
    console.log('Adding refresh_token column to users table...');
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS refresh_token TEXT;
    `);
    console.log('Successfully added refresh_token column.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
};

migrate();
