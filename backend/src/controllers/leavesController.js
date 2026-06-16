const pool = require('../config/db');

// Get leave summary for admin (company-wide)
const getLeaveSummary = async (req, res) => {
  try {
    // 1. Get total pending requests across company
    const pendingQuery = `
      SELECT COUNT(*) as count
      FROM leave_requests
      WHERE status = 'Pending'
    `;
    const pendingResult = await pool.query(pendingQuery);
    const pendingRequests = parseInt(pendingResult.rows[0].count);

    // 2. Get Team Out Today count
    const today = new Date().toISOString().split('T')[0];
    const teamOutQuery = `
      SELECT COUNT(DISTINCT user_id) as count
      FROM leave_requests
      WHERE status = 'Approved' 
        AND start_date <= $1 
        AND end_date >= $1
    `;
    const teamOutResult = await pool.query(teamOutQuery, [today]);
    const teamOutToday = parseInt(teamOutResult.rows[0].count);

    // 3. Get total approved leaves this month
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const approvedThisMonthQuery = `
      SELECT COUNT(*) as count
      FROM leave_requests
      WHERE status = 'Approved'
        AND EXTRACT(MONTH FROM start_date) = $1
        AND EXTRACT(YEAR FROM start_date) = $2
    `;
    const approvedMonthResult = await pool.query(approvedThisMonthQuery, [currentMonth, currentYear]);
    const approvedThisMonth = parseInt(approvedMonthResult.rows[0].count);

    res.json({
      success: true,
      data: {
        pendingRequests,
        teamOutToday,
        approvedThisMonth
      }
    });

  } catch (error) {
    console.error('Error fetching leave summary:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch leave summary' } });
  }
};

// Get upcoming leaves (company-wide Approved leaves starting in the future)
const getUpcomingLeaves = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const query = `
      SELECT lr.id, lr.leave_type, lr.start_date, lr.end_date, lr.status, lr.reason, u.full_name as employee_name
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.user_id
      WHERE lr.start_date >= $1 AND lr.status = 'Approved'
      ORDER BY lr.start_date ASC
      LIMIT 20
    `;
    const result = await pool.query(query, [today]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching upcoming leaves:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch upcoming leaves' } });
  }
};

// Apply for a leave
const applyForLeave = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { leaveType, startDate, endDate, reason } = req.body;

    if (!leaveType || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: { message: 'Missing required fields' } });
    }

    // Insert request as 'Pending'
    const insertQuery = `
      INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, status, reason)
      VALUES ($1, $2, $3, $4, 'Pending', $5)
      RETURNING id, status
    `;
    await pool.query(insertQuery, [userId, leaveType, startDate, endDate, reason]);

    res.json({
      success: true,
      message: 'Leave request submitted successfully. It is now pending approval.'
    });

  } catch (error) {
    console.error('Error applying for leave:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to apply for leave' } });
  }
};

// Get calendar data (Company-wide Leaves for current month)
const getCalendarData = async (req, res) => {
  try {
    const { month, year } = req.query; // E.g., month=03, year=2026

    const query = `
      SELECT start_date, end_date, status, user_id
      FROM leave_requests
      WHERE status = 'Approved'
        AND (EXTRACT(MONTH FROM start_date) = $1 OR EXTRACT(MONTH FROM end_date) = $1)
        AND (EXTRACT(YEAR FROM start_date) = $2 OR EXTRACT(YEAR FROM end_date) = $2)
    `;
    const result = await pool.query(query, [parseInt(month), parseInt(year)]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch calendar data' } });
  }
};

// Fetch all Pending Requests for Admin
const getAllPendingRequests = async (req, res) => {
  try {
    const query = `
      SELECT lr.id, lr.user_id, lr.leave_type, lr.start_date, lr.end_date, lr.status, lr.reason, lr.created_at, u.full_name as employee_name, u.email
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.user_id
      WHERE lr.status = 'Pending'
      ORDER BY lr.created_at ASC
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching pending requests:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch pending requests' } });
  }
};

// Approve or Reject leave request
const updateLeaveStatus = async (req, res) => {
  const client = await pool.pool.connect();
  try {
    const { id } = req.params;
    const { status } = req.body; // 'Approved' or 'Rejected'

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid status' } });
    }

    await client.query('BEGIN');

    // Get the request details
    const reqRes = await client.query('SELECT user_id, leave_type, start_date, end_date, status FROM leave_requests WHERE id = $1', [id]);
    if (reqRes.rows.length === 0) {
      throw new Error('Leave request not found');
    }

    const leaveReq = reqRes.rows[0];
    if (leaveReq.status !== 'Pending') {
      throw new Error('Leave request is already processed');
    }

    // Update status
    await client.query('UPDATE leave_requests SET status = $1 WHERE id = $2', [status, id]);

    // If approved, deduct balance
    if (status === 'Approved') {
      const start = new Date(leaveReq.start_date);
      const end = new Date(leaveReq.end_date);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const currentYear = start.getFullYear();

      await client.query(`
        UPDATE leave_balances
        SET used_days = used_days + $1
        WHERE user_id = $2 AND leave_type = $3 AND year = $4
      `, [diffDays, leaveReq.user_id, leaveReq.leave_type, currentYear]);
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `Leave request ${status.toLowerCase()} successfully` });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating leave status:', error);
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to update status' } });
  } finally {
    client.release();
  }
};

module.exports = {
  getLeaveSummary,
  getUpcomingLeaves,
  applyForLeave,
  getCalendarData,
  getAllPendingRequests,
  updateLeaveStatus
};
