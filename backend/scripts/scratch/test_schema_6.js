const db = require('./src/config/db');

(async () => {
  try {
    const res = await db.query("SELECT image_url FROM structural_images WHERE part_id = 19");
    console.log(res.rows);
    process.exit(0);
  } catch(e) {
    console.error('Error:', e);
    process.exit(1);
  }
})();
