require('dotenv').config({ path: './.env' });
const db = require('./src/config/db');

async function test() {
  try {
    const roles = await db.query('SELECT * FROM roles');
    console.log(roles.rows);
  } catch(e) {
    console.error(e);
  }
  process.exit();
}

test();
