const validateTask = (req, res, next) => {
  const { task_title, status, priority, task_type } = req.body;

  if (!task_title || task_title.trim() === '') {
    return res.status(400).json({ success: false, error: { message: 'Task title is required' } });
  }

  const validStatuses = ['Backlog', 'To Do', 'In Progress', 'Code Review', 'Testing', 'Completed', 'Blocked', 'On Hold', 'Cancelled'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid status' } });
  }

  const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid priority' } });
  }

  const validTypes = ['Task', 'Bug', 'Feature', 'Improvement', 'Story', 'Epic', 'Research', 'Documentation', 'Meeting', 'Deployment', 'Maintenance'];
  if (task_type && !validTypes.includes(task_type)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid task type' } });
  }

  next();
};

module.exports = {
  validateTask
};
