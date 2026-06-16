const pool = require('../config/db');

// Get leave balances, recent requests, and team status
const getLeaveSummary = async (req, res) => {
  try {
    const userId = req.user.user_id; // From auth middleware
    const currentYear = new Date().getFullYear();

    // 1. Get Balances
    const balancesQuery = `
      SELECT leave_type, total_days, used_days
      FROM leave_balances
      WHERE user_id = $1 AND year = $2
    `;
    const balancesResult = await pool.query(balancesQuery, [userId, currentYear]);

    // Format balances
    const balances = {
      PTO: { total: 19, used: 0 },
      'Sick Leave': { total: 10, used: 0 },
      Personal: { total: 3, used: 0 }
    };

    balancesResult.rows.forEach(b => {
      balances[b.leave_type] = {
        total: parseFloat(b.total_days),
        used: parseFloat(b.used_days)
      };
    });

    // 2. Get Pending Requests count
    const pendingQuery = `
      SELECT COUNT(*) as count
      FROM leave_requests
      WHERE user_id = $1 AND status = 'Pending'
    `;
    const pendingResult = await pool.query(pendingQuery, [userId]);
    const pendingRequests = parseInt(pendingResult.rows[0].count);

    // 3. Get Team Out Today count (simplified: anyone approved and today is between start_date and end_date)
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

    res.json({
      success: true,
      data: {
        balances,
        pendingRequests,
        teamOutToday
      }
    });

  } catch (error) {
    console.error('Error fetching leave summary:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch leave summary' } });
  }
};

// Get upcoming leaves (Approved leaves starting in the future)
const getUpcomingLeaves = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const today = new Date().toISOString().split('T')[0];

    const query = `
      SELECT id, leave_type, start_date, end_date, status, reason
      FROM leave_requests
      WHERE user_id = $1 AND start_date > $2 AND status = 'Approved'
      ORDER BY start_date ASC
    `;
    const result = await pool.query(query, [userId, today]);

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

    // Insert request (status defaults to Pending based on DB schema)
    // For this implementation, we will auto-approve it to update the balance immediately if the user desires
    const insertQuery = `
      INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, status, reason)
      VALUES ($1, $2, $3, $4, 'Approved', $5)
      RETURNING id, status
    `;
    await pool.query(insertQuery, [userId, leaveType, startDate, endDate, reason]);

    // Calculate days requested (simple diff, no weekend/holiday skip for now)
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end

    // Update balance
    const currentYear = new Date().getFullYear();
    await pool.query(`
      UPDATE leave_balances
      SET used_days = used_days + $1
      WHERE user_id = $2 AND leave_type = $3 AND year = $4
    `, [diffDays, userId, leaveType, currentYear]);

    res.json({
      success: true,
      message: 'Leave request submitted and approved automatically'
    });

  } catch (error) {
    console.error('Error applying for leave:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to apply for leave' } });
  }
};

// Get calendar data (Leaves for current month)
const getCalendarData = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { month, year } = req.query; // E.g., month=03, year=2026

    // This is simplified. We return all leave days for the given user in the given month.
    // For team data, we'd need more complex logic. 
    // We will just return the user's leaves to populate the dots.
    const query = `
      SELECT start_date, end_date, status
      FROM leave_requests
      WHERE user_id = $1 
        AND status = 'Approved'
        AND (EXTRACT(MONTH FROM start_date) = $2 OR EXTRACT(MONTH FROM end_date) = $2)
        AND (EXTRACT(YEAR FROM start_date) = $3 OR EXTRACT(YEAR FROM end_date) = $3)
    `;
    const result = await pool.query(query, [userId, parseInt(month), parseInt(year)]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch calendar data' } });
  }
};

module.exports = {
  getLeaveSummary,
  getUpcomingLeaves,
  applyForLeave,
  getCalendarData
};
