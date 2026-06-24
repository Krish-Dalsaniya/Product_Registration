const db = require('../../config/db');

// Get all projects with team and product names
const getProjects = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        p.project_id,
        p.project_name,
        p.status,
        p.team_id,
        p.product_id,
        t.team_name,
        prod.product_name
      FROM projects p
      LEFT JOIN teams t ON p.team_id = t.team_id
      LEFT JOIN products prod ON p.product_id = prod.product_id
      ORDER BY p.project_name ASC
    `);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

const createProject = async (req, res) => {
  const { 
    project_name, 
    team_id, 
    product_id, 
    status = 'Active'
  } = req.body;
  
  try {
    const result = await db.query(
      `INSERT INTO projects (
        project_name, 
        team_id, 
        product_id, 
        status
      ) VALUES ($1, $2, $3, $4) RETURNING project_id, project_name`,
      [
        project_name, 
        team_id || null, 
        product_id || null, 
        status
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: { message: 'Project name already exists' } });
    }
    res.status(500).json({ error: { message: error.message } });
  }
};

const updateProject = async (req, res) => {
  const { id } = req.params;
  const { 
    project_name, 
    team_id, 
    product_id, 
    status 
  } = req.body;
  
  try {
    await db.query(
      `UPDATE projects 
       SET project_name = $1, 
           team_id = $2, 
           product_id = $3, 
           status = $4
       WHERE project_id = $5`,
      [
        project_name, 
        team_id || null, 
        product_id || null, 
        status || 'Active', 
        id
      ]
    );

    res.json({ success: true, message: 'Project updated successfully' });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

const deleteProject = async (req, res) => {
  const { id } = req.params;
  try {
    // Designer projects might reference this project, so delete them first
    await db.withTransaction(async (client) => {
      // Unlink or delete from designer_projects
      await client.query('DELETE FROM designer_projects WHERE project_id = $1', [id]);
      
      const result = await client.query('DELETE FROM projects WHERE project_id = $1 RETURNING project_id', [id]);
      
      if (result.rows.length === 0) {
         throw new Error('NOT_FOUND');
      }
    });

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    if (error.message === 'NOT_FOUND') {
       return res.status(404).json({ error: { message: 'Project not found' } });
    }
    res.status(500).json({ error: { message: error.message } });
  }
};

module.exports = {
  getProjects,
  createProject,
  updateProject,
  deleteProject
};
