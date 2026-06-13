const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://product_registration_user:productregistration45@165.232.191.122:5432/product_registration'
});
client.connect().then(() => {
  return client.query('CREATE TABLE IF NOT EXISTS user_mobile (user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE, mobile_number VARCHAR(10));');
}).then(res => {
  console.log('Created user_mobile table');
  client.end();
}).catch(err => {
  console.error('Failed to create table:', err.message);
  client.end();
});
