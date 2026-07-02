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

    // 2. Total Trainees
    const traineeResult = await pool.query(`SELECT COUNT(*)::int as count FROM hr_trainees WHERE status != 'Completed'`);
    metrics.totalTrainees = traineeResult.rows[0].count;

    // 3. Upcoming Holidays
    const holidayResult = await pool.query(`
      SELECT COUNT(*)::int as count 
      FROM hr_holidays 
      WHERE date >= CURRENT_DATE
    `);
    metrics.upcomingHolidays = holidayResult.rows[0].count;

    // 4. Processed Payrolls (This Month)
    const payrollResult = await pool.query(`
      SELECT COUNT(*)::int as count 
      FROM hr_payrolls 
      WHERE month = EXTRACT(MONTH FROM CURRENT_DATE) 
      AND year = EXTRACT(YEAR FROM CURRENT_DATE)
      AND status = 'Processed'
    `);
    metrics.processedPayrolls = payrollResult.rows[0].count;

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
        LIMIT 2
      )
      UNION ALL
      (
        SELECT 
          'trainee' as type, 
          'New Trainee Onboarded' as title, 
          t.first_name || ' ' || t.last_name || ' joined as trainee' as desc, 
          t.created_at as created_at
        FROM hr_trainees t
        ORDER BY t.created_at DESC
        LIMIT 2
      )
      UNION ALL
      (
        SELECT 
          'payroll' as type, 
          'Payroll Processed' as title, 
          'Payroll finalized for ' || u.full_name as desc,
          p.updated_at as created_at
        FROM hr_payrolls p
        JOIN hr_employees e ON p.employee_id = e.employee_id
        JOIN users u ON e.user_id = u.user_id
        WHERE p.status = 'Processed'
        ORDER BY p.updated_at DESC
        LIMIT 2
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

    // 7. Top Performers
    const topPerformersResult = await pool.query(`
      SELECT e.employee_id, e.emp_code, u.full_name, d.name as department_name, u.image_url,
      (SELECT COUNT(*)::int FROM hr_attendance a WHERE a.employee_id = e.employee_id AND a.status = 'Present') as present_days,
      (SELECT COUNT(*)::int FROM hr_attendance a WHERE a.employee_id = e.employee_id AND a.status IN ('Present', 'Late', 'Absent', 'Half Day')) as total_days
      FROM hr_employees e
      JOIN users u ON e.user_id = u.user_id
      LEFT JOIN hr_departments d ON e.department_id = d.department_id
      WHERE e.employment_status != 'Terminated'
      LIMIT 10
    `);
    
    metrics.topPerformers = topPerformersResult.rows.map(emp => {
      const attendanceScore = emp.total_days > 0 ? Math.round((emp.present_days / emp.total_days) * 100) : 100;
      // Add a mock performance rating out of 5 based on attendance + random offset for demo
      const rating = Math.min(5, Math.max(1, (attendanceScore / 20) + (Math.random() * 0.5 - 0.25))).toFixed(1);
      return {
        ...emp,
        attendance_score: attendanceScore,
        performance_rating: parseFloat(rating),
        review_status: parseFloat(rating) >= 4.5 ? 'Excellent' : (parseFloat(rating) >= 3.5 ? 'Good' : 'Average')
      }
    }).sort((a, b) => b.performance_rating - a.performance_rating).slice(0, 5);

    sendSuccess(res, metrics, 'HR Dashboard metrics fetched successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardMetrics
};
