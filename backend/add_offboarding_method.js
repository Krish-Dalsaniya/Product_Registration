const db = require('./src/config/db');

async function main() {
    try {
        await db.query(`ALTER TABLE hr_offboarding ADD COLUMN IF NOT EXISTS offboarding_method VARCHAR(50) DEFAULT 'Resigned';`);
        console.log("Column 'offboarding_method' added successfully to 'hr_offboarding' table.");
    } catch (e) {
        console.error("Error adding column:", e);
    } finally {
        process.exit(0);
    }
}
main();
