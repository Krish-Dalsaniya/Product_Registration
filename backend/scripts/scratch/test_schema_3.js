const db = require('./src/config/db');

(async () => {
  try {
    const res = await db.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'structural_part_master'");
    console.log(res.rows);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
})();
