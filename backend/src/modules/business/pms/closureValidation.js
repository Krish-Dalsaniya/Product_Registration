const validateClosure = (req, res, next) => {
  // Only strictly require these fields on POST, or if they are passed in PUT
  if (req.method === 'POST') {
    const { closure_date, items } = req.body;
    if (!closure_date) {
      return res.status(400).json({ success: false, error: { message: 'Closure date is required' } });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'At least one closure item is required' } });
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.task_description || item.task_description.trim() === '') {
        return res.status(400).json({ success: false, error: { message: `Task description is required for item ${i + 1}` } });
      }
      if (item.hours_spent === undefined || item.hours_spent === null || isNaN(item.hours_spent) || Number(item.hours_spent) <= 0) {
        return res.status(400).json({ success: false, error: { message: `Valid hours spent is required for item ${i + 1}` } });
      }
    }
  } else if (req.method === 'PUT') {
    // If items are passed during PUT, validate them
    const { items } = req.body;
    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: { message: 'At least one closure item is required when updating items' } });
      }
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.task_description || item.task_description.trim() === '') {
          return res.status(400).json({ success: false, error: { message: `Task description is required for item ${i + 1}` } });
        }
        if (item.hours_spent === undefined || item.hours_spent === null || isNaN(item.hours_spent) || Number(item.hours_spent) <= 0) {
          return res.status(400).json({ success: false, error: { message: `Valid hours spent is required for item ${i + 1}` } });
        }
      }
    }
  }

  next();
};

module.exports = {
  validateClosure
};
