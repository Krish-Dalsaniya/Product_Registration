const pool = require('../config/db');

// Get all projects
const getProjects = async (req, res) => {
  try {
    const result = await pool.query('SELECT project_id, project_name FROM projects WHERE status = \'Active\'');
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

// Get all products
const getProducts = async (req, res) => {
  try {
    const result = await pool.query('SELECT product_id, product_name FROM products WHERE is_active = true');
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

// Assign project to team
const assignProjectToTeam = async (req, res) => {
  const { team_id, project_id } = req.body;
  try {
    await pool.query('UPDATE projects SET team_id = $1 WHERE project_id = $2', [team_id, project_id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: { message: error.message } });
  }
};

module.exports = {
  getProjects,
  getProducts,
  assignProjectToTeam
};
