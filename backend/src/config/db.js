const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

/**
 * Execute a SQL query
 * @param {string} text 
 * @param {any[]} params 
 */
const query = (text, params) => pool.query(text, params);

/**
 * Run database operations within a session that sets app context for RLS.
 * @param {string} userId - UUID of the user
 * @param {string} role - Role name
 * @param {Function} fn - Async function that takes a client
 */
const withSession = async (userId, role, fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL app.current_user_id = $1", [userId]);
    await client.query("SET LOCAL app.current_role = $1", [role]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  query,
  withSession,
  pool
};
