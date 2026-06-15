const { Client } = require('pg');
require('dotenv').config(); // Load from default .env

async function testCreate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  try {
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_attachments (
        attachment_id SERIAL PRIMARY KEY,
        message_id INT REFERENCES chat_messages(message_id) ON DELETE CASCADE,
        attachment_url TEXT NOT NULL,
        attachment_type VARCHAR(50),
        attachment_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Success creating chat_attachments table');
  } catch (err) {
    console.error('Failed creating table:', err.message);
  } finally {
    await client.end();
  }
}

testCreate();
