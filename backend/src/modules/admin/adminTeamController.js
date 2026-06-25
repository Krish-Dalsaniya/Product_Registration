const db = require('../../config/db');

// Get all designer teams with their projects and members
const getDesignerTeams = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        v.*, 
        (
          SELECT STRING_AGG(u.full_name, ', ')
          FROM team_members tm
          JOIN users u ON u.user_id = tm.user_id
          WHERE tm.team_id = v.team_id
        ) as member_names,
        COALESCE(
          (
            SELECT JSON_AGG(tm.user_id)
            FROM team_members tm
            WHERE tm.team_id = v.team_id
          ),
          '[]'::json
        ) as member_ids
      FROM v_team_project_summary v
    `);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

// Get sales "teams" (grouped by region or assignments)
const getSalesOverview = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        region, 
        COUNT(DISTINCT sales_id) as member_count,
        STRING_AGG(DISTINCT product_name, ', ') as products
      FROM v_sales_product_overview
      GROUP BY region
    `);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

// Get maintenance teams/staff and their products
const getMaintenanceOverview = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        certification, 
        COUNT(DISTINCT staff_user_id) as member_count,
        STRING_AGG(DISTINCT product_name, ', ') as products
      FROM v_maintenance_overview
      GROUP BY certification
    `);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

const createTeam = async (req, res) => {
  const { 
    team_name, 
    description, 
    role_name, 
    member_ids = [], 
    project_ids = [], 
    product_ids = [],
    product_name,
    product_description,
    team_lead_id,
    client_handler_id,
    module = 'Admin'
  } = req.body;
  try {
    const teamData = await db.withTransaction(async (client) => {
        const roleResult = await client.query('SELECT role_id FROM roles WHERE role_name = $1', [role_name]);
        const role_id = roleResult.rows[0]?.role_id;
        
        const teamResult = await client.query(
          `INSERT INTO teams (
            team_name, 
            description, 
            role_id, 
            product_name, 
            product_description, 
            team_lead_id, 
            client_handler_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING team_id`,
          [
            team_name, 
            description, 
            role_id, 
            product_name, 
            product_description, 
            team_lead_id || null, 
            client_handler_id || null
          ]
        );
        const team_id = teamResult.rows[0].team_id;

        // Insert into team_modules sidecar table
        await client.query(
          'INSERT INTO team_modules (team_id, module) VALUES ($1, $2)',
          [team_id, module]
        );

        // Assign members
        if (member_ids.length > 0) {
          const values = member_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
          await client.query(
            `INSERT INTO team_members (team_id, user_id) VALUES ${values}`,
            [team_id, ...member_ids]
          );
        }

        // Assign projects (for Designers)
        if (project_ids.length > 0) {
          const values = project_ids.map((_, i) => `$${i + 2}`).join(', ');
          await client.query(
            `UPDATE projects SET team_id = $1 WHERE project_id IN (${values})`,
            [team_id, ...project_ids]
          );
        }

        return { team_id, team_name };
    });

    res.status(201).json({ success: true, data: teamData });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: { message: 'Team name already exists' } });
    }
    res.status(500).json({ error: { message: error.message } });
  }
};


const updateTeam = async (req, res) => {
  const { id } = req.params;
  const { 
    team_name, 
    description, 
    member_ids = [], 
    product_name,
    product_description,
    team_lead_id,
    client_handler_id
  } = req.body;
  try {
    await db.withTransaction(async (client) => {
        await client.query(
          `UPDATE teams 
           SET team_name = $1, 
               description = $2, 
               product_name = $3, 
               product_description = $4, 
               team_lead_id = $5, 
               client_handler_id = $6
           WHERE team_id = $7`,
          [
            team_name, 
            description, 
            product_name, 
            product_description, 
            team_lead_id || null, 
            client_handler_id || null, 
            id
          ]
        );

        // Sync members: delete old and insert new
        await client.query('DELETE FROM team_members WHERE team_id = $1', [id]);
        if (member_ids.length > 0) {
          const values = member_ids.map((_, i) => `($1, $${i + 2})`).join(', ');
          await client.query(
            `INSERT INTO team_members (team_id, user_id) VALUES ${values}`,
            [id, ...member_ids]
          );
        }
    });

    res.json({ success: true, message: 'Team updated successfully' });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

const deleteTeam = async (req, res) => {
  const { id } = req.params;
  try {
    await db.withTransaction(async (client) => {
        // 1. Remove team members
        await client.query('DELETE FROM team_members WHERE team_id = $1', [id]);
        
        // 2. Unlink projects (set team_id to null)
        await client.query('UPDATE projects SET team_id = NULL WHERE team_id = $1', [id]);
        
        // 3. Delete the team
        const result = await client.query('DELETE FROM teams WHERE team_id = $1 RETURNING team_id', [id]);
        
        if (result.rows.length === 0) {
           throw new Error('NOT_FOUND');
        }
    });

    res.json({ success: true, message: 'Team deleted successfully' });
  } catch (error) {
    if (error.message === 'NOT_FOUND') {
       return res.status(404).json({ error: { message: 'Team not found' } });
    }
    res.status(500).json({ error: { message: error.message } });
  }
};

module.exports = {
  getDesignerTeams,
  getSalesOverview,
  getMaintenanceOverview,
  createTeam,
  updateTeam,
  deleteTeam
};

