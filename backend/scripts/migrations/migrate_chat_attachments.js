const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const db = require('../../src/config/db');

async function migrateChatAttachments() {
  try {
    console.log('Starting chat attachments migration...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_attachments (
        attachment_id SERIAL PRIMARY KEY,
        message_id INT REFERENCES chat_messages(message_id) ON DELETE CASCADE,
        attachment_url TEXT NOT NULL,
        attachment_type VARCHAR(50),
        attachment_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Chat attachments migration completed successfully.');
  } catch (err) {
    console.error('CHAT ATTACHMENTS MIGRATION ERROR:', err.message);
    throw err;
  }
}

if (require.main === module) {
  migrateChatAttachments().then(() => process.exit(0)).catch(err => {
    console.error('Immediate migration failed:', err);
    process.exit(1);
  });
}

module.exports = migrateChatAttachments;
