const pool = require('../../../config/db');

// Get sprints by project ID
const getProjectSprints = async (req, res) => {
  try {
    const { project_id } = req.query;
    const params = [];
    let query = `
      SELECT s.*, p.project_name, p.project_code,
             (SELECT COUNT(*) FROM pms_tasks WHERE sprint_id = s.sprint_id) as total_tasks,
             (SELECT COALESCE(SUM(story_points), 0) FROM pms_tasks WHERE sprint_id = s.sprint_id) as total_points,
             (SELECT COALESCE(SUM(story_points), 0) FROM pms_tasks WHERE sprint_id = s.sprint_id AND status = 'Completed') as completed_points
      FROM pms_sprints s
      LEFT JOIN pms_projects p ON s.project_id = p.project_id
    `;
    
    if (project_id) {
        query += ` WHERE s.project_id = $1`;
        params.push(project_id);
    }
    
    query += ` ORDER BY s.created_at ASC`;
    
    const result = await pool.query(query, params);
    
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

const getSprintMetrics = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Get Sprint info
    const sprintRes = await pool.query(`SELECT * FROM pms_sprints WHERE sprint_id = $1`, [id]);
    if (sprintRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Sprint not found' } });
    }
    const sprint = sprintRes.rows[0];

    // 2. Get Burndown Data
    // Fetch all tasks in sprint with their points
    const tasksRes = await pool.query(`SELECT task_id, story_points, status FROM pms_tasks WHERE sprint_id = $1`, [id]);
    const totalPoints = tasksRes.rows.reduce((sum, t) => sum + (t.story_points || 0), 0);

    // Fetch completion logs for these tasks
    const logsRes = await pool.query(`
      SELECT a.task_id, a.created_at::date as log_date, t.story_points
      FROM pms_task_activity_logs a
      JOIN pms_tasks t ON a.task_id = t.task_id
      WHERE t.sprint_id = $1 AND a.action = 'Updated Status' AND a.details->>'new_status' = 'Completed'
      ORDER BY a.created_at ASC
    `, [id]);

    // Construct daily burndown (start_date to end_date or today)
    const startDate = sprint.start_date ? new Date(sprint.start_date) : new Date();
    const endDate = sprint.end_date ? new Date(sprint.end_date) : new Date(startDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    const burndownData = [];
    let currentRemaining = totalPoints;
    
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const idealBurnRate = totalPoints / (totalDays > 1 ? totalDays - 1 : 1);

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      // Find points completed on this day
      const pointsCompletedToday = logsRes.rows
        .filter(l => new Date(l.log_date).toISOString().split('T')[0] === dateStr)
        .reduce((sum, l) => sum + (l.story_points || 0), 0);

      currentRemaining -= pointsCompletedToday;

      burndownData.push({
        date: dateStr,
        ideal: Math.max(0, Math.round(totalPoints - (idealBurnRate * i))),
        actual: i === 0 && pointsCompletedToday === 0 ? totalPoints : currentRemaining
      });
    }

    // 3. Get Velocity Data (Last 5 completed sprints for this project)
    const velocityRes = await pool.query(`
      SELECT s.sprint_name,
             (SELECT COALESCE(SUM(story_points), 0) FROM pms_tasks WHERE sprint_id = s.sprint_id) as planned,
             (SELECT COALESCE(SUM(story_points), 0) FROM pms_tasks WHERE sprint_id = s.sprint_id AND status = 'Completed') as completed
      FROM pms_sprints s
      WHERE s.project_id = $1 AND s.status = 'Completed'
      ORDER BY s.end_date ASC
      LIMIT 5
    `, [sprint.project_id]);

    res.json({
      success: true,
      data: {
        burndown: burndownData,
        velocity: velocityRes.rows
      }
    });
  } catch (error) {
    console.error('Error fetching sprint metrics:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch metrics' } });
  }
};

module.exports = {
  getProjectSprints,
  getSprintById,
  createSprint,
  updateSprint,
  deleteSprint,
  getSprintMetrics
};
