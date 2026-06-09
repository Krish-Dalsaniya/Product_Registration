const db = require('./src/config/db');

const sql = `
  ALTER TABLE finished_goods 
  ADD COLUMN IF NOT EXISTS communication_protocol JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ota_protocol JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS data_format JSONB DEFAULT '[]'::jsonb;
`;

db.query(sql)
  .then(() => {
    console.log('Successfully altered finished_goods table to add protocol columns.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error altering table:', err.message);
    process.exit(1);
  });
