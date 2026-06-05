const {pool} = require('./src/config/db');
async function testCreate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const roleInsert = await client.query(
      'INSERT INTO roles (role_name, description, created_at) VALUES ($1, $2, NOW()) RETURNING role_id',
      ['TestRoleX', 'desc']
    );
    console.log(roleInsert.rows);
    await client.query('ROLLBACK');
  } catch(e) {
    console.error('Error:', e);
    await client.query('ROLLBACK');
  } finally {
    client.release();
    pool.end();
  }
}
testCreate();
