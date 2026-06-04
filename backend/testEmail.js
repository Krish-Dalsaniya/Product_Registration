require('dotenv').config({ path: './.env' });
const db = require('./src/config/db');

async function test() {
  try {
    const users = await db.query('SELECT * FROM users WHERE email = $1', ['asad@example.com']);
    console.log('Exists:', users.rows.length > 0);
  } catch(e) {
    console.error(e);
  }
  process.exit();
}

test();
