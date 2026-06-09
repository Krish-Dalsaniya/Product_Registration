const db = require('./src/config/db');

const sql = `
  ALTER TABLE finished_goods 
  ADD COLUMN IF NOT EXISTS communication JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS power_controller BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS motherboard_id INTEGER REFERENCES pcb_master(pcb_id) ON DELETE SET NULL;
`;

db.query(sql)
  .then(() => {
    console.log('Successfully altered finished_goods table to add software feature columns.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error altering table:', err.message);
    process.exit(1);
  });
