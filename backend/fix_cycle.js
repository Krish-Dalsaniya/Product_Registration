const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://product_registration_user:productregistration45@165.232.191.122:5432/product_registration',
});

async function run() {
  await client.connect();
  
  // Set MD's parent_id to null to break cycle
  await client.query("UPDATE hr_designations SET parent_id = null WHERE name = 'MD'");
  
  console.log('Fixed cycle!');
  await client.end();
}
run();
