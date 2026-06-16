const pool = require('../config/db');

const calculateWorkingDays = (startDate, endDate, isHalfDay = false) => {
  if (isHalfDay) return 0.5;

  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  
  let curDate = new Date(start.getTime());
  while (curDate <= end) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0) count++; // Only skip Sunday (0)
    curDate.setDate(curDate.getDate() + 1);
  }
  return count;
};

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
    const { leaveType, startDate, endDate, reason, isHalfDay, halfDayType, attachmentUrl } = req.body;

    if (!leaveType || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: { message: 'Missing required fields' } });
    }

    const requestedDays = calculateWorkingDays(startDate, endDate, isHalfDay);

    // Fetch user balances
    const currentYear = new Date(startDate).getFullYear();
    const balRes = await pool.query('SELECT total_days, used_days FROM leave_balances WHERE user_id = $1 AND leave_type = $2 AND year = $3', [userId, leaveType, currentYear]);
    
    let available = 0;
    if (balRes.rows.length > 0) {
      available = parseFloat(balRes.rows[0].total_days) - parseFloat(balRes.rows[0].used_days);
    }

    if (requestedDays > available && leaveType !== 'Unpaid Leave' && leaveType !== 'LOP (Loss Of Pay)') {
      return res.status(400).json({ success: false, error: { message: `Insufficient leave balance. You requested ${requestedDays} days but only have ${available} days available.` } });
    }

    // Insert request as 'Pending'
    const insertQuery = `
      INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, status, reason, is_half_day, half_day_type, attachment_url)
      VALUES ($1, $2, $3, $4, 'Pending', $5, $6, $7, $8)
      RETURNING id, status
    `;
    await pool.query(insertQuery, [userId, leaveType, startDate, endDate, reason, isHalfDay || false, halfDayType || null, attachmentUrl || null]);

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
      SELECT lr.start_date, lr.end_date, lr.status, lr.user_id, lr.leave_type, u.full_name as employee_name
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.user_id
      WHERE lr.status = 'Approved'
        AND (EXTRACT(MONTH FROM lr.start_date) = $1 OR EXTRACT(MONTH FROM lr.end_date) = $1)
        AND (EXTRACT(YEAR FROM lr.start_date) = $2 OR EXTRACT(YEAR FROM lr.end_date) = $2)
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
    const reqRes = await client.query('SELECT user_id, leave_type, start_date, end_date, status, is_half_day FROM leave_requests WHERE id = $1', [id]);
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
      const diffDays = calculateWorkingDays(start, end, leaveReq.is_half_day);
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

const getUserLeaveBalances = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const currentYear = new Date().getFullYear();
    const query = `SELECT leave_type, total_days, used_days FROM leave_balances WHERE user_id = $1 AND year = $2`;
    const result = await pool.query(query, [userId, currentYear]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching balances:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch leave balances' } });
  }
};

const getEmployeeLeaveData = async (req, res) => {
  try {
    const { id } = req.params;
    let userIdUuid = id;

    // If id is not a valid UUID (e.g. it's a numeric ID like '4'), look up the user_id from hr_employees
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      const userRes = await pool.query('SELECT user_id FROM hr_employees WHERE employee_id = $1', [parseInt(id)]);
      if (userRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: { message: 'Employee not found' } });
      }
      userIdUuid = userRes.rows[0].user_id;
    }
    
    const currentYear = new Date().getFullYear();
    const balRes = await pool.query('SELECT leave_type, total_days, used_days FROM leave_balances WHERE user_id = $1 AND year = $2', [userIdUuid, currentYear]);
    const histRes = await pool.query('SELECT id, leave_type, start_date, end_date, status, reason, is_half_day, half_day_type, attachment_url, created_at FROM leave_requests WHERE user_id = $1 ORDER BY created_at DESC', [userIdUuid]);

    res.json({
      success: true,
      data: { balances: balRes.rows, history: histRes.rows }
    });

  } catch (error) {
    console.error('Error fetching employee leave data:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch employee leave data' } });
  }
};

module.exports = {
  getLeaveSummary,
  getUpcomingLeaves,
  getCalendarData,
  applyForLeave,
  getAllPendingRequests,
  updateLeaveStatus,
  getUserLeaveBalances,
  getEmployeeLeaveData
};
