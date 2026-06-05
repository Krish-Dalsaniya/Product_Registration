const {pool} = require('./src/config/db');
pool.query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'users' OR table_name = 'roles'").then(res => {
  console.table(res.rows);
  pool.end();
});
