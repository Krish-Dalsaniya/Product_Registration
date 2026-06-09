const db = require('./src/config/db');

async function testInsert() {
  try {
    const result = await db.query(
      `INSERT INTO feature_mappings (mapping_name, hardware_features, software_features) 
       VALUES ($1, $2, $3) RETURNING *`,
      ['Test Mapping', JSON.stringify(['HW1', 'HW2']), JSON.stringify(['SW1'])]
    );
    console.log('Inserted:', result.rows[0]);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testInsert();
