const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_ELq1vlaIKU8c@ep-autumn-dawn-angk81z5-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require'
});
client.connect().then(() => {
  return client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(10);');
}).then(() => {
  console.log('mobile_number added to users');
  client.end();
}).catch(err => {
  console.error(err);
  client.end();
});
