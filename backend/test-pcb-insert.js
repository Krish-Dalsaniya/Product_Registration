const { Client } = require('pg');
require('dotenv').config();

async function run() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });
    
    try {
        await client.connect();
        console.log('Connected to DB');
        
        const res = await client.query(`SELECT pcb_name FROM PCB_MASTER`);
        console.log('PCBs:', res.rows.map(r => r.pcb_name));
    } catch (e) {
        console.error('Insert failed:', e.message);
    } finally {
        await client.end();
    }
}

run();
