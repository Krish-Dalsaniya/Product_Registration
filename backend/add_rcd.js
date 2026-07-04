const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL
});

async function run() {
    try {
        await client.connect();
        await client.query(`
            ALTER TABLE hr_onboarding ADD COLUMN IF NOT EXISTS rcd_checklist JSONB DEFAULT '[]'::jsonb;
        `);
        console.log('Successfully altered hr_onboarding to add rcd_checklist');
    } catch (err) {
        console.error('Error altering table:', err);
    } finally {
        await client.end();
    }
}

run();
