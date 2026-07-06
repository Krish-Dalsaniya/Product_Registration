const pool = require('../../../config/db');

// Get all closures with optional filters
const getAllClosures = async (req, res) => {
  try {
    const { employee, startDate, endDate, status } = req.query;
    
    let query = `
      SELECT c.*, u.full_name as employee_name
      FROM pms_closures c
      JOIN hr_employees e ON c.employee_id = e.employee_id
      JOIN users u ON e.user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];

    const isAdmin = req.user?.role_name?.toLowerCase() === 'admin';
    if (!isAdmin) {
      const empResult = await pool.query('SELECT employee_id FROM hr_employees WHERE user_id = $1', [req.user.user_id]);
      if (empResult.rows.length === 0) {
        return res.json({ success: true, data: [] }); // User is not an employee, returns no closures
      }
      params.push(empResult.rows[0].employee_id);
      query += ` AND c.employee_id = $${params.length}`;
    }

    if (employee) {
      params.push(`%${employee}%`);
      query += ` AND u.full_name ILIKE $${params.length}`;
    }
    if (startDate) {
      params.push(startDate);
      query += ` AND c.closure_date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND c.closure_date <= $${params.length}`;
    }
    if (status) {
      params.push(status);
      query += ` AND c.status = $${params.length}`;
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await pool.query(query, params);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching closures:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch closures' } });
  }
};

// Get closure by ID
const getClosureById = async (req, res) => {
  try {
    const { id } = req.params;

    const closureQuery = `
      SELECT c.*, u.full_name as employee_name
      FROM pms_closures c
      JOIN hr_employees e ON c.employee_id = e.employee_id
      JOIN users u ON e.user_id = u.user_id
      WHERE c.closure_id = $1
    `;
    const closureResult = await pool.query(closureQuery, [id]);

    if (closureResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Closure not found' } });
    }

    const itemsQuery = `
      SELECT i.*, p.project_name, t.task_title
      FROM pms_closure_items i
      LEFT JOIN pms_projects p ON i.project_id = p.project_id
      LEFT JOIN pms_tasks t ON i.task_id = t.task_id
      WHERE i.closure_id = $1
      ORDER BY i.created_at ASC
    `;
    const itemsResult = await pool.query(itemsQuery, [id]);

    const closureData = closureResult.rows[0];
    closureData.items = itemsResult.rows;

    res.json({ success: true, data: closureData });
  } catch (error) {
    console.error('Error fetching closure details:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch closure details' } });
  }
};

// Create a new closure
const createClosure = async (req, res) => {
  const client = await pool.pool.connect();
  try {
    const { closure_date, remarks, items } = req.body;
    let { status } = req.body;
    if (!status) status = 'Submitted';

    await client.query('BEGIN');

    // Get employee_id from authenticated user
    const empResult = await client.query('SELECT employee_id FROM hr_employees WHERE user_id = $1', [req.user.user_id]);
    if (empResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: { message: 'You must be registered as an employee to submit closures' } });
    }
    const employee_id = empResult.rows[0].employee_id;

    // Calculate total_hours
    const total_hours = items.reduce((sum, item) => sum + Number(item.hours_spent), 0);

    const closureQuery = `
      INSERT INTO pms_closures (employee_id, closure_date, total_hours, remarks, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING closure_id
    `;
    const closureResult = await client.query(closureQuery, [employee_id, closure_date, total_hours, remarks, status]);
    const closure_id = closureResult.rows[0].closure_id;

    for (const item of items) {
      const itemQuery = `
        INSERT INTO pms_closure_items (closure_id, project_id, task_id, task_description, hours_spent)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await client.query(itemQuery, [
        closure_id,
        item.project_id || null,
        item.task_id || null,
        item.task_description,
        item.hours_spent
      ]);
    }

    // Auto-approve if Admin created it with status Approved
    if (status === 'Approved') {
      const userRes = await client.query('SELECT user_id FROM hr_employees WHERE employee_id = $1', [employee_id]);
      const userId = userRes.rows[0].user_id;

      for (const item of items) {
        if (item.task_id) {
          await client.query(`
            INSERT INTO pms_task_time_logs (task_id, user_id, hours_logged, log_date, description)
            VALUES ($1, $2, $3, $4, $5)
          `, [item.task_id, userId, item.hours_spent, closure_date, item.task_description]);

          await client.query(`
            UPDATE pms_tasks 
            SET actual_logged_hours = COALESCE(actual_logged_hours, 0) + $1
            WHERE task_id = $2
          `, [item.hours_spent, item.task_id]);
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Closure created successfully', data: { closure_id } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating closure:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to create closure' } });
  } finally {
    client.release();
  }
};

// Update closure
const updateClosure = async (req, res) => {
  const client = await pool.pool.connect();
  try {
    const { id } = req.params;
    const { status, remarks, items } = req.body;

    await client.query('BEGIN');

    const prevClosure = await client.query('SELECT status, employee_id, closure_date FROM pms_closures WHERE closure_id = $1', [id]);
    const previousStatus = prevClosure.rows[0]?.status;
    const employee_id = prevClosure.rows[0]?.employee_id;
    const closure_date = prevClosure.rows[0]?.closure_date;

    if (status || remarks) {
      const updates = [];
      const params = [];
      let paramCount = 1;

      if (status) {
        updates.push(`status = $${paramCount++}`);
        params.push(status);
      }
      if (remarks !== undefined) {
        updates.push(`remarks = $${paramCount++}`);
        params.push(remarks);
      }

      if (updates.length > 0) {
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(id);
        const updateQuery = `UPDATE pms_closures SET ${updates.join(', ')} WHERE closure_id = $${paramCount}`;
        await client.query(updateQuery, params);
      }
    }

    // Only update items if they are passed (e.g. during an edit mode vs just approval)
    if (items && Array.isArray(items)) {
      // For simplicity, delete old and insert new.
      await client.query('DELETE FROM pms_closure_items WHERE closure_id = $1', [id]);
      
      let total_hours = 0;
      for (const item of items) {
        total_hours += Number(item.hours_spent);
        const itemQuery = `
          INSERT INTO pms_closure_items (closure_id, project_id, task_id, task_description, hours_spent)
          VALUES ($1, $2, $3, $4, $5)
        `;
        await client.query(itemQuery, [
          id,
          item.project_id || null,
          item.task_id || null,
          item.task_description,
          item.hours_spent
        ]);
      }
      
      await client.query('UPDATE pms_closures SET total_hours = $1 WHERE closure_id = $2', [total_hours, id]);
    }

    // If status transitioned to Approved, log time to tasks
    if (status === 'Approved' && previousStatus !== 'Approved') {
      const userRes = await client.query('SELECT user_id FROM hr_employees WHERE employee_id = $1', [employee_id]);
      const userId = userRes.rows[0]?.user_id;

      if (userId) {
        const finalItems = await client.query('SELECT * FROM pms_closure_items WHERE closure_id = $1', [id]);
        for (const item of finalItems.rows) {
          if (item.task_id) {
            await client.query(`
              INSERT INTO pms_task_time_logs (task_id, user_id, hours_logged, log_date, description)
              VALUES ($1, $2, $3, $4, $5)
            `, [item.task_id, userId, item.hours_spent, closure_date, item.task_description]);
  
            await client.query(`
              UPDATE pms_tasks 
              SET actual_logged_hours = COALESCE(actual_logged_hours, 0) + $1
              WHERE task_id = $2
            `, [item.hours_spent, item.task_id]);
          }
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Closure updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating closure:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update closure' } });
  } finally {
    client.release();
  }
};

// Delete closure
const deleteClosure = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM pms_closures WHERE closure_id = $1', [id]);
    res.json({ success: true, message: 'Closure deleted successfully' });
  } catch (error) {
    console.error('Error deleting closure:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to delete closure' } });
  }
};

// Get metrics
const getMetrics = async (req, res) => {
  try {
    let filterQuery = '';
    const params = [];
    
    const isAdmin = req.user?.role_name?.toLowerCase() === 'admin';
    if (!isAdmin) {
      const empResult = await pool.query('SELECT employee_id FROM hr_employees WHERE user_id = $1', [req.user.user_id]);
      if (empResult.rows.length === 0) {
        return res.json({
          success: true,
          data: { todaysClosures: 0, totalClosures: 0, pendingReview: 0, approved: 0 }
        });
      }
      params.push(empResult.rows[0].employee_id);
      filterQuery = ` AND employee_id = $1`;
    }

    // Today's Closures
    const todayQuery = `SELECT COUNT(*) as count FROM pms_closures WHERE closure_date = CURRENT_DATE${filterQuery}`;
    const todayRes = await pool.query(todayQuery, params);
    
    // Total Closures
    const totalQuery = `SELECT COUNT(*) as count FROM pms_closures WHERE 1=1${filterQuery}`;
    const totalRes = await pool.query(totalQuery, params);
    
    // Pending Review
    const pendingQuery = `SELECT COUNT(*) as count FROM pms_closures WHERE (status = 'Submitted' OR status = 'Pending')${filterQuery}`;
    const pendingRes = await pool.query(pendingQuery, params);
    
    // Approved Closures
    const approvedQuery = `SELECT COUNT(*) as count FROM pms_closures WHERE status = 'Approved'${filterQuery}`;
    const approvedRes = await pool.query(approvedQuery, params);

    res.json({
      success: true,
      data: {
        todaysClosures: parseInt(todayRes.rows[0].count, 10),
        totalClosures: parseInt(totalRes.rows[0].count, 10),
        pendingReview: parseInt(pendingRes.rows[0].count, 10),
        approved: parseInt(approvedRes.rows[0].count, 10)
      }
    });
  } catch (error) {
    console.error('Error fetching closure metrics:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch metrics' } });
  }
};

module.exports = {
  getAllClosures,
  getClosureById,
  createClosure,
  updateClosure,
  deleteClosure,
  getMetrics
};
