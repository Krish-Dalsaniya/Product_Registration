const {pool} = require('./src/config/db');
pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'roles'").then(res => {
  console.log(res.rows);
  pool.end();
});
