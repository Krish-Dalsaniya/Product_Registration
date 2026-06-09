const fs = require("fs");
const path = require("path");
const db = require("./src/config/db");

async function runMigration() {
  try {
    const schemaPath = path.join(__dirname, "database", "finished_goods_schema.sql");
    const sql = fs.readFileSync(schemaPath, "utf8");
    console.log("Running Finished Goods migration...");
    await db.query(sql);
    console.log("Migration successful!");
    return true;
  } catch (err) {
    console.error("Migration failed:", err);
    throw err;
  }
}

module.exports = runMigration;
