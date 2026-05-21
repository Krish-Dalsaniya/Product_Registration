const { Pool } = require('pg');
const env = require('./src/config/env');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Creating support_tickets table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        ticket_id VARCHAR(50) UNIQUE NOT NULL,
        creator_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
        creator_name VARCHAR(255) NOT NULL,
        query_date DATE NOT NULL,
        last_date DATE,
        resolved_date DATE,
        query_type VARCHAR(100),
        query_description TEXT,
        troubleshooting_steps TEXT,
        steps_followed BOOLEAN DEFAULT false,
        priority VARCHAR(50) DEFAULT 'Normal',
        status VARCHAR(50) DEFAULT 'Pending',
        assigned_to VARCHAR(255),
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add indexes for performance
    console.log('Adding indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_id ON support_tickets(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
      CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
