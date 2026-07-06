const pool = require('../../../config/db');

// Get epics by project ID
const getProjectEpics = async (req, res) => {
  try {
    const { project_id } = req.query;
    if (!project_id) {
        return res.status(400).json({ success: false, error: { message: 'Project ID is required' } });
    }

    const query = `
      SELECT e.*,
             (SELECT COUNT(*) FROM pms_tasks WHERE epic_id = e.epic_id) as total_tasks,
             (SELECT COUNT(*) FROM pms_tasks WHERE epic_id = e.epic_id AND status = 'Completed') as completed_tasks
      FROM pms_epics e
      WHERE e.project_id = $1
      ORDER BY e.created_at DESC
    `;
    const result = await pool.query(query, [project_id]);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching epics:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch epics' } });
  }
};

const getEpicById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT * FROM pms_epics WHERE epic_id = $1`, [id]);
    if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Epic not found' } });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching epic:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch epic' } });
  }
};

const createEpic = async (req, res) => {
  try {
    const { project_id, name, description, start_date, target_date } = req.body;
    
    if (!project_id || !name) {
        return res.status(400).json({ success: false, error: { message: 'Project ID and Name are required' } });
    }

    const query = `
      INSERT INTO pms_epics (project_id, name, description, start_date, target_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const values = [project_id, name, description || null, start_date || null, target_date || null];

    const result = await pool.query(query, values);
    res.status(201).json({ success: true, message: 'Epic created successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error creating epic:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to create epic' } });
  }
};

const updateEpic = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, start_date, target_date, status } = req.body;

    const updates = [];
    const params = [];
    let paramCount = 1;

    const buildUpdate = (field, value) => {
      if (value !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        params.push(value === '' ? null : value);
      }
    };

    buildUpdate('name', name);
    buildUpdate('description', description);
    buildUpdate('start_date', start_date);
    buildUpdate('target_date', target_date);
    buildUpdate('status', status);

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'No fields provided to update' } });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    
    const updateQuery = `UPDATE pms_epics SET ${updates.join(', ')} WHERE epic_id = $${paramCount} RETURNING *`;
    const result = await pool.query(updateQuery, params);

    res.json({ success: true, message: 'Epic updated successfully', data: result.rows[0] });
  } catch (error) {
    console.error('Error updating epic:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update epic' } });
  }
};

const deleteEpic = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Unlink tasks from this epic before deleting
    await pool.query('UPDATE pms_tasks SET epic_id = NULL WHERE epic_id = $1', [id]);
    
    await pool.query('DELETE FROM pms_epics WHERE epic_id = $1', [id]);
    res.json({ success: true, message: 'Epic deleted successfully' });
  } catch (error) {
    console.error('Error deleting epic:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to delete epic' } });
  }
};

module.exports = {
  getProjectEpics,
  getEpicById,
  createEpic,
  updateEpic,
  deleteEpic
};
