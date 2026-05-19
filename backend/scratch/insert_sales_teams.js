const { pool } = require('../src/config/db');
require('dotenv').config();

async function seedTeams() {
  try {
    console.log('Seeding Sales & Maintenance teams...');
    
    // Get roles
    const rolesRes = await pool.query('SELECT role_id, role_name FROM roles');
    const roles = {};
    rolesRes.rows.forEach(r => roles[r.role_name] = r.role_id);
    
    const salesRoleId = roles['Sales'];
    const maintenanceRoleId = roles['Maintenance'];
    
    if (!salesRoleId) {
      throw new Error('Sales role not found in roles table');
    }
    
    // Get Sales users
    const salesUsersRes = await pool.query("SELECT user_id, full_name FROM users WHERE role_id = $1", [salesRoleId]);
    const salesUsers = salesUsersRes.rows;
    console.log('Found sales users:', salesUsers.map(u => u.full_name));

    // Get Maintenance users
    const maintenanceUsersRes = await pool.query("SELECT user_id, full_name FROM users WHERE role_id = $1", [maintenanceRoleId]);
    const maintenanceUsers = maintenanceUsersRes.rows;
    console.log('Found maintenance users:', maintenanceUsers.map(u => u.full_name));

    // 1. Insert Sales Teams if they don't exist
    const salesTeams = [
      { name: 'Sales Team Alpha', desc: 'Handles high-value accounts and strategic clients' },
      { name: 'Global Sales Network', desc: 'Coordinates international distributor networks' },
      { name: 'Regional Sales Crew', desc: 'Manages domestic and local sales leads' }
    ];
    
    const salesTeamIds = [];
    for (const team of salesTeams) {
      const res = await pool.query(
        `INSERT INTO teams (team_name, description, role_id) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (team_name) DO UPDATE SET description = EXCLUDED.description, role_id = EXCLUDED.role_id
         RETURNING team_id, team_name`,
        [team.name, team.desc, salesRoleId]
      );
      console.log(`Inserted/updated team: ${res.rows[0].team_name}`);
      salesTeamIds.push(res.rows[0].team_id);
    }

    // 2. Insert Maintenance Teams if they don't exist
    const maintenanceTeams = [
      { name: 'Maintenance Crew Alpha', desc: 'Handles critical hardware and calibration tasks' },
      { name: 'Facility Systems Team', desc: 'Maintains office and server infrastructure' }
    ];
    
    const maintenanceTeamIds = [];
    for (const team of maintenanceTeams) {
      const res = await pool.query(
        `INSERT INTO teams (team_name, description, role_id) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (team_name) DO UPDATE SET description = EXCLUDED.description, role_id = EXCLUDED.role_id
         RETURNING team_id, team_name`,
        [team.name, team.desc, maintenanceRoleId]
      );
      console.log(`Inserted/updated team: ${res.rows[0].team_name}`);
      maintenanceTeamIds.push(res.rows[0].team_id);
    }

    // 3. Assign Sales users to Sales Teams
    if (salesUsers.length > 0 && salesTeamIds.length > 0) {
      console.log('Assigning sales users to sales teams...');
      for (let i = 0; i < salesUsers.length; i++) {
        const userId = salesUsers[i].user_id;
        const teamId = salesTeamIds[i % salesTeamIds.length];
        
        await pool.query(
          `INSERT INTO team_members (team_id, user_id) 
           VALUES ($1, $2) 
           ON CONFLICT DO NOTHING`,
          [teamId, userId]
        );
      }
    }

    // 4. Assign Maintenance users to Maintenance Teams
    if (maintenanceUsers.length > 0 && maintenanceTeamIds.length > 0) {
      console.log('Assigning maintenance users to maintenance teams...');
      for (let i = 0; i < maintenanceUsers.length; i++) {
        const userId = maintenanceUsers[i].user_id;
        const teamId = maintenanceTeamIds[i % maintenanceTeamIds.length];
        
        await pool.query(
          `INSERT INTO team_members (team_id, user_id) 
           VALUES ($1, $2) 
           ON CONFLICT DO NOTHING`,
          [teamId, userId]
        );
      }
    }
    
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await pool.end();
  }
}

seedTeams();
