const pool = require('../../../config/db');

// Get all projects with optional filters
const getAllProjects = async (req, res) => {
  try {
    const { search, status, priority, team_id } = req.query;
    
    let query = `
      SELECT p.*, 
             t.team_name,
             prod.product_name,
             u1.full_name as team_lead_name,
             u2.full_name as client_handler_name
      FROM pms_projects p
      LEFT JOIN teams t ON p.team_id = t.team_id
      LEFT JOIN products prod ON p.product_id = prod.product_id
      LEFT JOIN users u1 ON p.team_lead_id = u1.user_id
      LEFT JOIN users u2 ON p.client_handler_id = u2.user_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (p.project_code ILIKE $${params.length} OR p.project_name ILIKE $${params.length})`;
    }
    if (status) {
      params.push(status);
      query += ` AND p.status = $${params.length}`;
    }
    if (priority) {
      params.push(priority);
      query += ` AND p.priority = $${params.length}`;
    }
    if (team_id) {
      params.push(team_id);
      query += ` AND p.team_id = $${params.length}`;
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await pool.query(query, params);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch projects' } });
  }
};

// Get project by ID
const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT p.*, 
             t.team_name,
             prod.product_name,
             u1.full_name as team_lead_name,
             u2.full_name as client_handler_name
      FROM pms_projects p
      LEFT JOIN teams t ON p.team_id = t.team_id
      LEFT JOIN products prod ON p.product_id = prod.product_id
      LEFT JOIN users u1 ON p.team_lead_id = u1.user_id
      LEFT JOIN users u2 ON p.client_handler_id = u2.user_id
      WHERE p.project_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Project not found' } });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching project details:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch project details' } });
  }
};

// Create a new project
const createProject = async (req, res) => {
  try {
    const { 
      project_code, project_name, description, team_id, 
      product_id, start_date, end_date, status, priority, progress_percentage,
      team_lead_id, client_handler_id, project_members,
      repository_owner, repository_name
    } = req.body;

    const query = `
      INSERT INTO pms_projects (
        project_code, project_name, description, team_id, 
        product_id, start_date, end_date, status, priority, progress_percentage,
        team_lead_id, client_handler_id, project_members, created_by,
        repository_owner, repository_name
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING project_id
    `;
    const values = [
      project_code, project_name, description, team_id || null, 
      product_id || null, start_date || null, end_date || null, 
      status || 'Planned', priority || 'Medium', progress_percentage || 0,
      team_lead_id || null, client_handler_id || null, 
      project_members ? JSON.stringify(project_members) : '[]',
      req.user.user_id,
      repository_owner || null,
      repository_name || null
    ];

    const result = await pool.query(query, values);
    
    res.status(201).json({ success: true, message: 'Project created successfully', data: { project_id: result.rows[0].project_id } });
  } catch (error) {
    console.error('Error creating project:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ success: false, error: { message: 'Project code already exists' } });
    }
    if (error.code === '22P02') { // Invalid input syntax
      return res.status(400).json({ success: false, error: { message: 'Invalid data format provided (e.g., UUID or number expected)' } });
    }
    if (error.code === '23503') { // Foreign key violation
      return res.status(400).json({ success: false, error: { message: 'Referenced department, owner, or product does not exist' } });
    }
    res.status(500).json({ success: false, error: { message: 'Failed to create project: ' + (error.detail || error.message) } });
  }
};

// Update project
const updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      project_code, project_name, description, team_id, 
      product_id, start_date, end_date, status, priority, progress_percentage,
      team_lead_id, client_handler_id, project_members,
      repository_owner, repository_name
    } = req.body;

    const updates = [];
    const params = [];
    let paramCount = 1;

    const buildUpdate = (field, value) => {
      if (value !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        params.push(value === '' ? null : value);
      }
    };

    buildUpdate('project_code', project_code);
    buildUpdate('project_name', project_name);
    buildUpdate('description', description);
    buildUpdate('team_id', team_id);
    buildUpdate('product_id', product_id);
    buildUpdate('start_date', start_date);
    buildUpdate('end_date', end_date);
    buildUpdate('status', status);
    buildUpdate('priority', priority);
    buildUpdate('progress_percentage', progress_percentage);
    buildUpdate('team_lead_id', team_lead_id);
    buildUpdate('client_handler_id', client_handler_id);
    buildUpdate('repository_owner', repository_owner);
    buildUpdate('repository_name', repository_name);

    if (project_members !== undefined) {
      updates.push(`project_members = $${paramCount++}`);
      params.push(JSON.stringify(project_members));
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'No fields provided to update' } });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    
    const updateQuery = `UPDATE pms_projects SET ${updates.join(', ')} WHERE project_id = $${paramCount}`;
    await pool.query(updateQuery, params);

    res.json({ success: true, message: 'Project updated successfully' });
  } catch (error) {
    console.error('Error updating project:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: { message: 'Project code already exists' } });
    }
    if (error.code === '22P02') {
      return res.status(400).json({ success: false, error: { message: 'Invalid data format provided' } });
    }
    if (error.code === '23503') {
      return res.status(400).json({ success: false, error: { message: 'Referenced department, owner, or product does not exist' } });
    }
    res.status(500).json({ success: false, error: { message: 'Failed to update project: ' + (error.detail || error.message) } });
  }
};

// Delete project
const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM pms_projects WHERE project_id = $1', [id]);
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to delete project' } });
  }
};

// Get metrics
const getMetrics = async (req, res) => {
  try {
    const totalQuery = `SELECT COUNT(*) as count FROM pms_projects`;
    const totalRes = await pool.query(totalQuery);
    
    const activeQuery = `SELECT COUNT(*) as count FROM pms_projects WHERE status IN ('Planned', 'In Progress')`;
    const activeRes = await pool.query(activeQuery);
    
    const completedQuery = `SELECT COUNT(*) as count FROM pms_projects WHERE status = 'Completed'`;
    const completedRes = await pool.query(completedQuery);
    
    const holdQuery = `SELECT COUNT(*) as count FROM pms_projects WHERE status = 'On Hold'`;
    const holdRes = await pool.query(holdQuery);

    res.json({
      success: true,
      data: {
        totalProjects: parseInt(totalRes.rows[0].count, 10),
        activeProjects: parseInt(activeRes.rows[0].count, 10),
        completedProjects: parseInt(completedRes.rows[0].count, 10),
        onHoldProjects: parseInt(holdRes.rows[0].count, 10)
      }
    });
  } catch (error) {
    console.error('Error fetching project metrics:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch metrics' } });
  }
};

// Get Portfolio Metrics (for Gantt/Timeline)
const getPortfolioMetrics = async (req, res) => {
  try {
    const query = `
      SELECT p.project_id, p.project_code, p.project_name, p.status, p.start_date, p.end_date
      FROM pms_projects p
      ORDER BY p.created_at DESC
    `;
    const projectsRes = await pool.query(query);
    
    const epicsQuery = `
      SELECT epic_id, project_id, name, start_date, target_date, status
      FROM pms_epics
    `;
    const epicsRes = await pool.query(epicsQuery);

    const sprintsQuery = `
      SELECT sprint_id, project_id, sprint_name, start_date, end_date, status
      FROM pms_sprints
    `;
    const sprintsRes = await pool.query(sprintsQuery);

    const portfolio = projectsRes.rows.map(p => {
       return {
          ...p,
          epics: epicsRes.rows.filter(e => e.project_id === p.project_id),
          sprints: sprintsRes.rows.filter(s => s.project_id === p.project_id)
       }
    });

    res.json({ success: true, data: portfolio });
  } catch (error) {
    console.error('Error fetching portfolio metrics:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch portfolio metrics' } });
  }
};

module.exports = {
  getAllProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getMetrics,
  getPortfolioMetrics
};
