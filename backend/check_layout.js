const { pool } = require('./src/config/db');
pool.query("SELECT q.id, q.config FROM form_questions q WHERE q.config != '{}'::jsonb AND q.config ? 'layout' LIMIT 3")
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); })
  .finally(() => pool.end());
