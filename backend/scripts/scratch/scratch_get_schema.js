const fs = require('fs');
const { Pool } = require('pg');
const env = require('./src/config/env');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

async function getSchema() {
  try {
    const tablesRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'");
    const schema = {};
    for (const row of tablesRes.rows) {
      const tableName = row.table_name;
      const colsRes = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1", [tableName]);
      schema[tableName] = colsRes.rows;
    }
    const fkRes = await pool.query(`
      SELECT
        tc.table_name, kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
      WHERE constraint_type = 'FOREIGN KEY'
    `);
    fs.writeFileSync('schema_dump.json', JSON.stringify({ schema, foreignKeys: fkRes.rows }, null, 2));
    console.log('Schema dumped to schema_dump.json');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

getSchema();
