const { pool } = require('./src/config/db');

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Add role_id to teams
    await client.query(`ALTER TABLE teams ADD COLUMN IF NOT EXISTS role_id INT REFERENCES roles(role_id)`);
    
    // Fix team_members to use user_id and reference users table
    await client.query(`
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='team_members' AND column_name='designer_id') THEN
          ALTER TABLE team_members RENAME COLUMN designer_id TO user_id;
        END IF;
      END $$;
    `);

    // Update constraints
    await client.query(`
      ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_designer_id_fkey;
      ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_user_id_fkey;
      ALTER TABLE team_members ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
    `);

    await client.query('COMMIT');
    console.log('Migration successful: Teams updated to support all roles');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    process.exit();
  }
};

migrate();
