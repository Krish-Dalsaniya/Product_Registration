const pool = require('../../../config/db');

// Get sprints by project ID
const getProjectSprints = async (req, res) => {
  try {
    const { project_id } = req.query;
    if (!project_id) {
        return res.status(400).json({ success: false, error: { message: 'Project ID is required' } });
    }

    const query = `
      SELECT s.*,
             (SELECT COUNT(*) FROM pms_tasks WHERE sprint_id = s.sprint_id) as total_tasks,
             (SELECT COALESCE(SUM(story_points), 0) FROM pms_tasks WHERE sprint_id = s.sprint_id) as total_points,
             (SELECT COALESCE(SUM(story_points), 0) FROM pms_tasks WHERE sprint_id = s.sprint_id AND status = 'Completed') as completed_points
      FROM pms_sprints s
      WHERE s.project_id = $1
      ORDER BY s.created_at ASC
    `;
    const result = await pool.query(query, [project_id]);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching sprints:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch sprints' } });
  }
};

const getSprintById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT * FROM pms_sprints WHERE sprint_id = $1`, [id]);
    if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Sprint not found' } });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching sprint:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch sprint' } });
  }
};

const createSprint = async (req, res) => {
  try {
    const { project_id, sprint_name, goal, start_date, end_date } = req.body;
    
    if (!project_id || !sprint_name) {
        return res.status(400).json({ success: false, error: { message: 'Project ID and Sprint Name are required' } });
    }

    const query = `
      INSERT INTO pms_sprints (project_id, sprint_name, goal, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [project_id, sprint_name, goal || null, start_date || null, end_date || null];

    const result = await pool.query(query, values);
    res.status(201).json({ success: true, message: 'Sprint created successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error creating sprint:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to create sprint' } });
  }
};

const updateSprint = async (req, res) => {
  try {
    const { id } = req.params;
    const { sprint_name, goal, start_date, end_date, status } = req.body;

    const updates = [];
    const params = [];
    let paramCount = 1;

    const buildUpdate = (field, value) => {
      if (value !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        params.push(value === '' ? null : value);
      }
    };

    buildUpdate('sprint_name', sprint_name);
    buildUpdate('goal', goal);
    buildUpdate('start_date', start_date);
    buildUpdate('end_date', end_date);
    buildUpdate('status', status);

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'No fields provided to update' } });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    
    const updateQuery = `UPDATE pms_sprints SET ${updates.join(', ')} WHERE sprint_id = $${paramCount} RETURNING *`;
    const result = await pool.query(updateQuery, params);

    res.json({ success: true, message: 'Sprint updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating sprint:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update sprint' } });
  }
};

const deleteSprint = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Unlink tasks from this sprint before deleting
    await pool.query('UPDATE pms_tasks SET sprint_id = NULL WHERE sprint_id = $1', [id]);
    
    await pool.query('DELETE FROM pms_sprints WHERE sprint_id = $1', [id]);
    res.json({ success: true, message: 'Sprint deleted successfully' });
  } catch (error) {
    console.error('Error deleting sprint:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to delete sprint' } });
  }
};

module.exports = {
  getProjectSprints,
  getSprintById,
  createSprint,
  updateSprint,
  deleteSprint
};
