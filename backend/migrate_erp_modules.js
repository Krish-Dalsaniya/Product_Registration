const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Inserting ERP Module permissions...');
    
    // Insert new top-level module permissions
    await client.query(`
      INSERT INTO permissions (permission_key, description) VALUES 
        ('hr', 'Access HR Module'),
        ('crm', 'Access CRM Module'),
        ('logistics', 'Access Logistics Module'),
        ('accounts', 'Access Accounts Module')
      ON CONFLICT (permission_key) DO NOTHING;
    `);

    console.log('Creating audit_logs table if not exists...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
          log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(100),
          entity_id VARCHAR(255),
          old_value JSONB,
          new_value JSONB,
          ip_address VARCHAR(45),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // We will leave company_id migration for later to avoid breaking existing users/tables 
    // before the full multi-tenant logic is hooked up in the backend API layer.

    await client.query('COMMIT');
    console.log('ERP Foundation Migration successful.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
