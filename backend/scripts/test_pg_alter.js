const { Client } = require('pg');

async function testPostgres() {
  const client = new Client({
    connectionString: 'postgresql://postgres:productregistration45@165.232.191.122:5432/product_registration'
  });
  try {
    await client.connect();
    await client.query(`
      ALTER TABLE chat_messages 
      ADD COLUMN IF NOT EXISTS attachment_url TEXT,
      ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS attachment_name TEXT;
      
      ALTER TABLE chat_messages ALTER COLUMN message DROP NOT NULL;
    `);
    console.log('Success altering with postgres user');
  } catch (err) {
    console.error('Failed with postgres user:', err.message);
  } finally {
    await client.end();
  }
}

testPostgres();
