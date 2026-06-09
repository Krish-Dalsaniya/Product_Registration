const db = require('./src/config/db');

async function checkTableSchema(tableName) {
  try {
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);
    
    if (result.rows.length === 0) {
      console.log(`Table '${tableName}' not found or has no columns.`);
    } else {
      console.log(`Schema for table: ${tableName}`);
      console.table(result.rows);
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

const table = process.argv[2];
if (!table) {
  console.log('Please provide a table name as an argument.');
  process.exit(1);
}

checkTableSchema(table);