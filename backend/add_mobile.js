const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://product_registration_user:productregistration45@165.232.191.122:5432/product_registration'
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
