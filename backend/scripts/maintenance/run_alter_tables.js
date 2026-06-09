const db = require('./src/config/db');
const fs = require('fs');
const path = require('path');

async function runSql() {
    const sqlPath = path.join(__dirname, 'add_file_fields_to_categories.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    try {
        await db.query(sql);
        console.log("SUCCESS: Database schema updated with file and gallery fields.");
    } catch (err) {
        console.error("SQL EXECUTION ERROR:", err);
    } finally {
        process.exit();
    }
}

runSql();
