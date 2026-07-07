const db = require('./src/config/db');

async function alterTable() {
  try {
    await db.query(`
      ALTER TABLE open_positions 
      ADD COLUMN IF NOT EXISTS rcd_doc TEXT,
      ADD COLUMN IF NOT EXISTS prerequisite_doc TEXT,
      ADD COLUMN IF NOT EXISTS training_doc TEXT,
      ADD COLUMN IF NOT EXISTS eligibility_doc TEXT,
      ADD COLUMN IF NOT EXISTS kpi_doc TEXT,
      ADD COLUMN IF NOT EXISTS kra_doc TEXT,
      ADD COLUMN IF NOT EXISTS lms_training_ids JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('Table open_positions altered successfully.');
  } catch (error) {
    console.error('Error altering table:', error);
  } finally {
    process.exit();
  }
}

alterTable();
