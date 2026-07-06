const pool = require('../../../config/db');

// Get all tasks with optional filters
const getAllTasks = async (req, res) => {
  try {
    const { project_id, team_id, assignee_id, status, priority, search, sprint_id } = req.query;
    
    let query = `
      SELECT t.*, 
             p.project_name, p.project_code,
             tm.team_name,
             u1.full_name as assignee_name, u1.image_url as assignee_image,
             u2.full_name as reporter_name, u2.image_url as reporter_image,
             u3.full_name as reviewer_name, u3.image_url as reviewer_image,
             sp.sprint_name,
             e.name as epic_name
      FROM pms_tasks t
      LEFT JOIN pms_projects p ON t.project_id = p.project_id
      LEFT JOIN teams tm ON t.team_id = tm.team_id
      LEFT JOIN users u1 ON t.assignee_id = u1.user_id
      LEFT JOIN users u2 ON t.reporter_id = u2.user_id
      LEFT JOIN users u3 ON t.reviewer_id = u3.user_id
      LEFT JOIN pms_sprints sp ON t.sprint_id = sp.sprint_id
      LEFT JOIN pms_epics e ON t.epic_id = e.epic_id
      WHERE 1=1
    `;
    const params = [];

    if (project_id) {
      params.push(project_id);
      query += ` AND t.project_id = $${params.length}`;
    }
    if (sprint_id === 'null') {
      query += ` AND t.sprint_id IS NULL`;
    } else if (sprint_id) {
      params.push(sprint_id);
      query += ` AND t.sprint_id = $${params.length}`;
    }
    if (team_id) {
      params.push(team_id);
      query += ` AND t.team_id = $${params.length}`;
    }
    if (assignee_id) {
      params.push(assignee_id);
      query += ` AND t.assignee_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND t.status = $${params.length}`;
    }
    if (priority) {
      params.push(priority);
      query += ` AND t.priority = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (t.task_title ILIKE $${params.length} OR t.task_description ILIKE $${params.length})`;
    }

    query += ` ORDER BY t.created_at DESC`;

    const result = await pool.query(query, params);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch tasks' } });
  }
};

// Get task by ID
const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT t.*, 
             p.project_name, p.project_code,
             tm.team_name,
             u1.full_name as assignee_name, u1.image_url as assignee_image,
             u2.full_name as reporter_name, u2.image_url as reporter_image,
             u3.full_name as reviewer_name, u3.image_url as reviewer_image,
             sp.sprint_name,
             e.name as epic_name
      FROM pms_tasks t
      LEFT JOIN pms_projects p ON t.project_id = p.project_id
      LEFT JOIN teams tm ON t.team_id = tm.team_id
      LEFT JOIN users u1 ON t.assignee_id = u1.user_id
      LEFT JOIN users u2 ON t.reporter_id = u2.user_id
      LEFT JOIN users u3 ON t.reviewer_id = u3.user_id
      LEFT JOIN pms_sprints sp ON t.sprint_id = sp.sprint_id
      LEFT JOIN pms_epics e ON t.epic_id = e.epic_id
      WHERE t.task_id = $1
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Task not found' } });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching task details:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch task details' } });
  }
};

// Create a new task
const createTask = async (req, res) => {
  try {
    const { 
      task_title, task_description, task_type, project_id, team_id,
      assignee_id, reporter_id, reviewer_id, parent_task_id, tags,
      priority, status, start_date, due_date, estimated_hours, sprint_id, story_points, epic_id
    } = req.body;

    const query = `
      INSERT INTO pms_tasks (
        task_title, task_description, task_type, project_id, team_id,
        assignee_id, reporter_id, reviewer_id, parent_task_id, tags,
        priority, status, start_date, due_date, estimated_hours, remaining_hours, sprint_id, story_points, epic_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $15, $16, $17, $18)
      RETURNING task_id
    `;
    const values = [
      task_title, task_description || null, task_type || 'Task', project_id || null, team_id || null,
      assignee_id || null, reporter_id || req.user.user_id, reviewer_id || null, parent_task_id || null, tags ? JSON.stringify(tags) : '[]',
      priority || 'Medium', status || 'Backlog', start_date || null, due_date || null, estimated_hours || 0,
      sprint_id || null, story_points || 0, epic_id || null
    ];

    const result = await pool.query(query, values);
    const taskId = result.rows[0].task_id;
    
    // Log Activity
    await pool.query(
      `INSERT INTO pms_task_activity_logs (task_id, user_id, action, details) VALUES ($1, $2, $3, $4)`,
      [taskId, req.user.user_id, 'Created Task', JSON.stringify({ status: status || 'Backlog' })]
    );

    res.status(201).json({ success: true, message: 'Task created successfully', data: { task_id: taskId } });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to create task' } });
  }
};

// Update task
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    // Get current task to diff status for activity log
    const currentTask = await pool.query(`SELECT status FROM pms_tasks WHERE task_id = $1`, [id]);
    if (currentTask.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Task not found' } });
    }
    const oldStatus = currentTask.rows[0].status;

    const updates = [];
    const params = [];
    let paramCount = 1;

    const buildUpdate = (field, value) => {
      if (value !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        params.push(value === '' ? null : value);
      }
    };

    const updatableFields = [
      'task_title', 'task_description', 'task_type', 'project_id', 'team_id',
      'assignee_id', 'reporter_id', 'reviewer_id', 'parent_task_id',
      'priority', 'status', 'start_date', 'due_date', 'estimated_hours', 'remaining_hours', 'sprint_id', 'story_points', 'epic_id'
    ];

    updatableFields.forEach(field => buildUpdate(field, body[field]));

    if (body.tags !== undefined) {
      updates.push(`tags = $${paramCount++}`);
      params.push(JSON.stringify(body.tags));
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'No fields provided to update' } });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    
    const updateQuery = `UPDATE pms_tasks SET ${updates.join(', ')} WHERE task_id = $${paramCount}`;
    await pool.query(updateQuery, params);

    // Log Activity if status changed
    if (body.status && body.status !== oldStatus) {
        await pool.query(
            `INSERT INTO pms_task_activity_logs (task_id, user_id, action, details) VALUES ($1, $2, $3, $4)`,
            [id, req.user.user_id, 'Updated Status', JSON.stringify({ old_status: oldStatus, new_status: body.status })]
        );
    }

    res.json({ success: true, message: 'Task updated successfully' });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update task' } });
  }
};

// Delete task
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM pms_tasks WHERE task_id = $1', [id]);
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to delete task' } });
  }
};

// Update task status (Specifically for Kanban drag-and-drop)
const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ success: false, error: { message: 'Status is required' } });
    }

    const currentTask = await pool.query(`SELECT status FROM pms_tasks WHERE task_id = $1`, [id]);
    if (currentTask.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Task not found' } });
    }
    const oldStatus = currentTask.rows[0].status;

    if (oldStatus === status) {
        return res.json({ success: true, message: 'Status unchanged' });
    }

    await pool.query(
        'UPDATE pms_tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE task_id = $2',
        [status, id]
    );

    await pool.query(
        `INSERT INTO pms_task_activity_logs (task_id, user_id, action, details) VALUES ($1, $2, $3, $4)`,
        [id, req.user.user_id, 'Updated Status', JSON.stringify({ old_status: oldStatus, new_status: status })]
    );

    res.json({ success: true, message: 'Task status updated' });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update task status' } });
  }
};

// --- Task Comments ---

const getTaskComments = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT c.*, u.full_name as author_name, u.image_url as author_image
            FROM pms_task_comments c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.task_id = $1
            ORDER BY c.created_at ASC
        `;
        const result = await pool.query(query, [id]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching task comments:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch comments' } });
    }
};

const addTaskComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { comment_text, mentions, attachments } = req.body;

        if (!comment_text) {
            return res.status(400).json({ success: false, error: { message: 'Comment text is required' } });
        }

        const query = `
            INSERT INTO pms_task_comments (task_id, user_id, comment_text, mentions, attachments)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING comment_id, created_at
        `;
        const values = [
            id, req.user.user_id, comment_text, 
            mentions ? JSON.stringify(mentions) : '[]', 
            attachments ? JSON.stringify(attachments) : '[]'
        ];

        const result = await pool.query(query, values);
        
        await pool.query(
            `INSERT INTO pms_task_activity_logs (task_id, user_id, action) VALUES ($1, $2, $3)`,
            [id, req.user.user_id, 'Added Comment']
        );

        res.status(201).json({ success: true, message: 'Comment added', data: result.rows[0] });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to add comment' } });
    }
};

// --- Time Logging ---
const getTaskTimeLogs = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT l.*, u.full_name as logger_name, u.image_url as logger_image
            FROM pms_task_time_logs l
            JOIN users u ON l.user_id = u.user_id
            WHERE l.task_id = $1
            ORDER BY l.log_date DESC, l.created_at DESC
        `;
        const result = await pool.query(query, [id]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching time logs:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch time logs' } });
    }
};

const addTimeLog = async (req, res) => {
    try {
        const { id } = req.params;
        const { hours_logged, log_date, description } = req.body;

        if (!hours_logged || !log_date) {
            return res.status(400).json({ success: false, error: { message: 'Hours and date are required' } });
        }

        const query = `
            INSERT INTO pms_task_time_logs (task_id, user_id, hours_logged, log_date, description)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING log_id
        `;
        const values = [id, req.user.user_id, hours_logged, log_date, description];

        await pool.query(query, values);
        
        // Update total actual hours logged in the task
        await pool.query(`
            UPDATE pms_tasks 
            SET actual_logged_hours = (SELECT COALESCE(SUM(hours_logged), 0) FROM pms_task_time_logs WHERE task_id = $1),
                remaining_hours = GREATEST(0, estimated_hours - ((SELECT COALESCE(SUM(hours_logged), 0) FROM pms_task_time_logs WHERE task_id = $1) + $2))
            WHERE task_id = $1
        `, [id, hours_logged]);

        await pool.query(
            `INSERT INTO pms_task_activity_logs (task_id, user_id, action, details) VALUES ($1, $2, $3, $4)`,
            [id, req.user.user_id, 'Logged Time', JSON.stringify({ hours: hours_logged, date: log_date })]
        );

        res.status(201).json({ success: true, message: 'Time logged successfully' });
    } catch (error) {
        console.error('Error logging time:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to log time' } });
    }
};

// --- Activity Logs ---
const getTaskActivityLogs = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT l.*, u.full_name as author_name, u.image_url as author_image
            FROM pms_task_activity_logs l
            JOIN users u ON l.user_id = u.user_id
            WHERE l.task_id = $1
            ORDER BY l.created_at DESC
        `;
        const result = await pool.query(query, [id]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch activity logs' } });
    }
};

// --- Metrics / KPIs ---
const getMetrics = async (req, res) => {
    try {
        const user_id = req.user.user_id;

        const totalQuery = `SELECT COUNT(*) as count FROM pms_tasks`;
        const totalRes = await pool.query(totalQuery);
        
        const myTasksQuery = `SELECT COUNT(*) as count FROM pms_tasks WHERE assignee_id = $1 AND status NOT IN ('Completed', 'Cancelled')`;
        const myTasksRes = await pool.query(myTasksQuery, [user_id]);
        
        const completedQuery = `SELECT COUNT(*) as count FROM pms_tasks WHERE status = 'Completed'`;
        const completedRes = await pool.query(completedQuery);
        
        const overdueQuery = `SELECT COUNT(*) as count FROM pms_tasks WHERE due_date < CURRENT_DATE AND status NOT IN ('Completed', 'Cancelled')`;
        const overdueRes = await pool.query(overdueQuery);

        const dueTodayQuery = `SELECT COUNT(*) as count FROM pms_tasks WHERE due_date = CURRENT_DATE AND status NOT IN ('Completed', 'Cancelled')`;
        const dueTodayRes = await pool.query(dueTodayQuery);

        res.json({
            success: true,
            data: {
                totalTasks: parseInt(totalRes.rows[0].count, 10),
                myTasks: parseInt(myTasksRes.rows[0].count, 10),
                completedTasks: parseInt(completedRes.rows[0].count, 10),
                overdueTasks: parseInt(overdueRes.rows[0].count, 10),
                tasksDueToday: parseInt(dueTodayRes.rows[0].count, 10)
            }
        });
    } catch (error) {
        console.error('Error fetching task metrics:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch metrics' } });
    }
};

// --- Subtasks ---
const getTaskSubtasks = async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
            SELECT t.*, u.full_name as assignee_name, u.image_url as assignee_image
            FROM pms_tasks t
            LEFT JOIN users u ON t.assignee_id = u.user_id
            WHERE t.parent_task_id = $1
            ORDER BY t.created_at ASC
        `;
        const result = await pool.query(query, [id]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching subtasks:', error);
        res.status(500).json({ success: false, error: { message: 'Failed to fetch subtasks' } });
    }
};

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  getTaskComments,
  addTaskComment,
  getTaskTimeLogs,
  addTimeLog,
  getTaskActivityLogs,
  getMetrics,
  getTaskSubtasks
};
