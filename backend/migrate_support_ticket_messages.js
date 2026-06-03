const { Pool } = require('pg');
const env = require('./src/config/env');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Creating support_ticket_messages table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_ticket_messages (
        id SERIAL PRIMARY KEY,
        ticket_id INT REFERENCES support_tickets(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add indexes for performance
    console.log('Adding indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON support_ticket_messages(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_created_at ON support_ticket_messages(created_at);
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
