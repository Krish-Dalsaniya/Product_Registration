const db = require('./src/config/db');

async function migrate() {
  try {
    console.log('Starting migration: create feature_mappings table...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS feature_mappings (
        mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        mapping_name VARCHAR(255) NOT NULL,
        hardware_features JSONB DEFAULT '[]',
        software_features JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
