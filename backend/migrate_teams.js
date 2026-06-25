const db = require('./src/config/db');

async function migrateTeams() {
  try {
    console.log('Creating team_modules sidecar table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS team_modules (
        team_id INTEGER PRIMARY KEY,
        module VARCHAR(50) NOT NULL DEFAULT 'Admin'
      );
    `);

    // Insert 'Admin' for all existing teams that aren't in the mapping yet
    console.log('Backfilling existing teams...');
    await db.query(`
      INSERT INTO team_modules (team_id, module)
      SELECT team_id, 'Admin' FROM teams
      ON CONFLICT (team_id) DO NOTHING;
    `);

    // Update the view to join with team_modules
    console.log('Recreating v_team_project_summary to include module...');
    await db.query(`
      DROP VIEW IF EXISTS v_team_project_summary CASCADE;
      CREATE VIEW v_team_project_summary AS
      SELECT 
          t.team_id,
          t.team_name,
          COALESCE(tm.module, 'Admin') as module,
          r.role_name,
          COUNT(DISTINCT p.project_id) AS active_projects
      FROM teams t
      JOIN roles r ON r.role_id = t.role_id
      LEFT JOIN team_modules tm ON tm.team_id = t.team_id
      LEFT JOIN projects p ON p.team_id = t.team_id AND p.status <> 'Completed'
      GROUP BY t.team_id, t.team_name, tm.module, r.role_name;
    `);

    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateTeams();
