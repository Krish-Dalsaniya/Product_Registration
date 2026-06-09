const db = require('./src/config/db');

const sql = `
  ALTER TABLE finished_goods 
  DROP COLUMN IF EXISTS communication,
  DROP COLUMN IF EXISTS communication_protocol,
  DROP COLUMN IF EXISTS ota_protocol,
  DROP COLUMN IF EXISTS data_format,
  ADD COLUMN IF NOT EXISTS communication_details JSONB DEFAULT '[]'::jsonb;
`;

db.query(sql)
  .then(() => {
    console.log('Successfully altered finished_goods table for structured communication details.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error altering table:', err.message);
    process.exit(1);
  });
