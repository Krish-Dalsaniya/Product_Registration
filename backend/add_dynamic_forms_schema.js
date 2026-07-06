const db = require('./src/config/db');

async function runMigration() {
  const client = await db.pool.connect();
  try {
    console.log('Starting migration to add dynamic form columns...');
    
    // Add columns if they don't exist
    await client.query(`
      ALTER TABLE candidate_evaluation_forms
      ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'file',
      ADD COLUMN IF NOT EXISTS form_schema JSONB;
    `);
    
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration();
