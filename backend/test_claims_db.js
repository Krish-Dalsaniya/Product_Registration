const db = require('./src/config/db');

async function test() {
    try {
        await db.query('SELECT * FROM hr_claims LIMIT 1');
        console.log('hr_claims exists');
    } catch (e) {
        console.error('Error on hr_claims:', e.message);
    }
    
    try {
        await db.query('SELECT * FROM hr_advances LIMIT 1');
        console.log('hr_advances exists');
    } catch (e) {
        console.error('Error on hr_advances:', e.message);
    }
    
    process.exit(0);
}

test();
