const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });
    
    try {
        await client.connect();
        
        const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'pcb_master';`);
        console.log('Columns:', res.rows.map(r => r.column_name));
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await client.end();
    }
}

run();
