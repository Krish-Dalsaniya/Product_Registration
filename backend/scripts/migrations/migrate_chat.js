const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'src', 'config', '.env') }); // Might be src/config/.env based on other files, but wait, migrate_categories used __dirname, '.env'. Let's check env path. Wait, migrate_categories uses '.env', let's use the same or just require('./src/config/db') to use existing pool.

const db = require('./src/config/db');

async function migrateChat() {
  try {
    console.log('Starting chat migration...');
    
    // Chat Messages Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        message_id SERIAL PRIMARY KEY,
        sender_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        receiver_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Chat migration completed successfully.');
  } catch (err) {
    console.error('CHAT MIGRATION ERROR:', err.message);
    throw err;
  }
}

// Only run immediately if this file is executed directly
if (require.main === module) {
  migrateChat().then(() => process.exit(0)).catch(err => {
    console.error('Immediate migration failed:', err);
    process.exit(1);
  });
}

module.exports = migrateChat;
