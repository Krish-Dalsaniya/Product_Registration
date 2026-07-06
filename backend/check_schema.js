const db = require('./src/config/db');

async function main() {
    try {
        const res = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'hr_offboarding'");
        console.log(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
main();
