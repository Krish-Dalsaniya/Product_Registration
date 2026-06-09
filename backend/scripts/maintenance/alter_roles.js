const {pool} = require('./src/config/db');
async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('ALTER TABLE roles ALTER COLUMN role_name TYPE VARCHAR(50) USING role_name::varchar;');
    await client.query('COMMIT');
    console.log('Successfully altered roles.role_name to VARCHAR');
  } catch(e) {
    console.error(e);
    await client.query('ROLLBACK');
  } finally {
    client.release();
    pool.end();
  }
}
run();
