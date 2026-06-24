const validateProject = (req, res, next) => {
  const { project_code, project_name, status, priority } = req.body;

  if (!project_code || project_code.trim() === '') {
    return res.status(400).json({ success: false, error: { message: 'Project code is required' } });
  }

  if (!project_name || project_name.trim() === '') {
    return res.status(400).json({ success: false, error: { message: 'Project name is required' } });
  }

  const validStatuses = ['Planned', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid status' } });
  }

  const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid priority' } });
  }

  next();
};

module.exports = {
  validateProject
};
