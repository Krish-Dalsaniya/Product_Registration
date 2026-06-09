const db = require('../src/config/db');

async function migrate() {
  try {
    console.log('Starting migration to add owner_contacts, accounts_contacts, and qa_qc_contacts columns...');
    
    // Add owner_contacts
    await db.query(`
      ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS owner_contacts jsonb DEFAULT '[]'::jsonb
    `);
    console.log('Added owner_contacts column successfully.');

    // Add accounts_contacts
    await db.query(`
      ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS accounts_contacts jsonb DEFAULT '[]'::jsonb
    `);
    console.log('Added accounts_contacts column successfully.');

    // Add qa_qc_contacts
    await db.query(`
      ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS qa_qc_contacts jsonb DEFAULT '[]'::jsonb
    `);
    console.log('Added qa_qc_contacts column successfully.');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
