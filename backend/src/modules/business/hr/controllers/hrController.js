const pool = require('../../../../config/db');
const { sendSuccess } = require('../../../../utils/response');

const getDashboardMetrics = async (req, res, next) => {
  try {
    const metrics = {
      totalEmployees: 0,
      onLeaveToday: 0,
      openPositions: 0, // Hardcoded per user request
      avgAttendance: 0,
      headcountTrend: [],
      departmentDistribution: [],
      recentActivity: []
    };

    // 1. Total Employees
    const totalEmpResult = await pool.query(`SELECT COUNT(*)::int as count FROM hr_employees WHERE employment_status != 'Terminated'`);
    metrics.totalEmployees = totalEmpResult.rows[0].count;

    // 2. On Leave Today
    const leaveResult = await pool.query(`
      SELECT COUNT(*)::int as count 
      FROM leave_requests 
      WHERE status = 'Approved' 
      AND CURRENT_DATE BETWEEN start_date AND end_date
    `);
    metrics.onLeaveToday = leaveResult.rows[0].count;

    // 3. Avg Attendance
    if (metrics.totalEmployees > 0) {
      const attendanceResult = await pool.query(`
        SELECT COUNT(*)::int as count 
        FROM hr_attendance 
        WHERE date = CURRENT_DATE 
        AND status IN ('Present', 'Late', 'Half Day')
      `);
      metrics.avgAttendance = Math.round((attendanceResult.rows[0].count / metrics.totalEmployees) * 100);
    }

    // 4. Department Distribution
    const deptResult = await pool.query(`
      SELECT d.name, COUNT(e.employee_id)::int as value
      FROM hr_departments d
      LEFT JOIN hr_employees e ON d.department_id = e.department_id AND e.employment_status != 'Terminated'
      GROUP BY d.name
      HAVING COUNT(e.employee_id) > 0
    `);
    metrics.departmentDistribution = deptResult.rows;

    // 5. Headcount Trend (Last 12 months)
    const trendResult = await pool.query(`
      WITH months AS (
          SELECT generate_series(
              date_trunc('month', CURRENT_DATE - INTERVAL '11 months'),
              date_trunc('month', CURRENT_DATE),
              '1 month'::interval
          ) AS month
      )
      SELECT 
          to_char(m.month, 'Mon') as month,
          (SELECT COUNT(*)::int FROM hr_employees WHERE date_of_joining < m.month + interval '1 month') as headcount
      FROM months m
      ORDER BY m.month;
    `);
    metrics.headcountTrend = trendResult.rows;

    // 6. Recent Activity
    const activityResult = await pool.query(`
      (
        SELECT 
          'onboarding' as type, 
          'New Employee Onboarded' as title, 
          e.emp_code || ' joined ' || COALESCE(d.name, 'the company') as desc, 
          e.created_at as created_at
        FROM hr_employees e
        LEFT JOIN hr_departments d ON e.department_id = d.department_id
        ORDER BY e.created_at DESC
        LIMIT 3
      )
      UNION ALL
      (
        SELECT 
          'leave' as type, 
          'Leave ' || lr.status as title, 
          lr.leave_type || ' for ' || u.full_name as desc,
          lr.updated_at as created_at
        FROM leave_requests lr
        JOIN users u ON lr.user_id = u.user_id
        WHERE lr.status IN ('Approved', 'Rejected')
        ORDER BY lr.updated_at DESC
        LIMIT 3
      )
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    const formatTimeAgo = (date) => {
      const seconds = Math.floor((new Date() - date) / 1000);
      let interval = seconds / 31536000;
      if (interval > 1) return Math.floor(interval) + " years ago";
      interval = seconds / 2592000;
      if (interval > 1) return Math.floor(interval) + " months ago";
      interval = seconds / 86400;
      if (interval > 1) return Math.floor(interval) + " days ago";
      interval = seconds / 3600;
      if (interval > 1) return Math.floor(interval) + " hours ago";
      interval = seconds / 60;
      if (interval > 1) return Math.floor(interval) + " mins ago";
      return "just now";
    };

    metrics.recentActivity = activityResult.rows.map(row => ({
      type: row.type,
      title: row.title,
      desc: row.desc,
      time: formatTimeAgo(new Date(row.created_at))
    }));

    sendSuccess(res, metrics, 'HR Dashboard metrics fetched successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardMetrics
};
