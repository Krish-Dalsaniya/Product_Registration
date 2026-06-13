const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://product_registration_user:productregistration45@165.232.191.122:5432/product_registration'
});
client.connect().then(() => {
  return client.query('SELECT mobile_number FROM users LIMIT 1;');
}).then(res => {
  console.log('Exists! rows:', res.rows);
  client.end();
}).catch(err => {
  console.error('Does not exist:', err.message);
  client.end();
});
