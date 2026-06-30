const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://product_registration_user:productregistration45@165.232.191.122:5432/product_registration'
});

const permissionsToInsert = [
  // Payrolls - Claims
  { key: 'hr.payrolls_claims.view', desc: 'View Claims' },
  { key: 'hr.payrolls_claims.create', desc: 'Create Claims' },
  { key: 'hr.payrolls_claims.edit', desc: 'Edit Claims' },
  { key: 'hr.payrolls_claims.delete', desc: 'Delete Claims' },

  // Payrolls - Advances
  { key: 'hr.payrolls_advances.view', desc: 'View Advances' },
  { key: 'hr.payrolls_advances.create', desc: 'Create Advances' },
  { key: 'hr.payrolls_advances.edit', desc: 'Edit Advances' },
  { key: 'hr.payrolls_advances.delete', desc: 'Delete Advances' },
];

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const perm of permissionsToInsert) {
      await client.query(`
        INSERT INTO permissions (permission_key, description) 
        VALUES ($1, $2)
        ON CONFLICT (permission_key) DO UPDATE SET description = EXCLUDED.description
      `, [perm.key, perm.desc]);
    }

    await client.query('COMMIT');
    console.log('Successfully inserted claims/advances permissions!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
