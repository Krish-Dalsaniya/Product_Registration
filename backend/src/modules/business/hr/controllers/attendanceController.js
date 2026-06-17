const db = require('../../../../config/db');
const { sendSuccess, sendError } = require('../../../../utils/response');

const getAttendance = async (req, res, next) => {
  try {
    const { start_date, end_date, department_id, search } = req.query;

    let query = `
      SELECT 
        a.attendance_id,
        a.employee_id,
        a.date,
        a.clock_in,
        a.clock_out,
        a.status,
        a.work_hours,
        a.notes,
        e.emp_code,
        e.department_id,
        u.full_name,
        u.email,
        u.image_url,
        d.name as department_name,
        ds.name as designation_name
      FROM hr_attendance a
      JOIN hr_employees e ON a.employee_id = e.employee_id
      JOIN users u ON e.user_id = u.user_id
      LEFT JOIN hr_departments d ON e.department_id = d.department_id
      LEFT JOIN hr_designations ds ON e.designation_id = ds.designation_id
      WHERE 1=1
    `;

    const values = [];
    let paramIndex = 1;

    if (start_date) {
      query += ` AND a.date >= $${paramIndex++}`;
      values.push(start_date);
    }
    
    if (end_date) {
      query += ` AND a.date <= $${paramIndex++}`;
      values.push(end_date);
    }

    if (department_id) {
      query += ` AND e.department_id = $${paramIndex++}`;
      values.push(department_id);
    }

    if (search) {
      query += ` AND (u.full_name ILIKE $${paramIndex} OR e.emp_code ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY a.date DESC, u.full_name ASC`;

    const result = await db.query(query, values);
    sendSuccess(res, result.rows, 'Attendance records fetched successfully');
  } catch (error) {
    next(error);
  }
};

const getAttendanceMetrics = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const query = `
      SELECT 
        COUNT(*) as total_records,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_count,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_count,
        SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late_count,
        SUM(CASE WHEN status = 'Half Day' THEN 1 ELSE 0 END) as half_day_count,
        SUM(CASE WHEN status = 'On Leave' THEN 1 ELSE 0 END) as on_leave_count
      FROM hr_attendance
      WHERE date = $1
    `;
    
    const result = await db.query(query, [today]);
    const metrics = result.rows[0] || {
      total_records: 0,
      present_count: 0,
      absent_count: 0,
      late_count: 0,
      half_day_count: 0,
      on_leave_count: 0
    };

    sendSuccess(res, metrics, 'Attendance metrics fetched successfully');
  } catch (error) {
    next(error);
  }
};

const clockIn = async (req, res, next) => {
  try {
    const { employee_id, notes } = req.body;
    const date = new Date().toISOString().split('T')[0];
    const clockInTime = new Date();

    // Check if already clocked in
    const checkQuery = `SELECT * FROM hr_attendance WHERE employee_id = $1 AND date = $2`;
    const checkResult = await db.query(checkQuery, [employee_id, date]);

    if (checkResult.rows.length > 0) {
      return sendError(res, 'ALREADY_CLOCKED_IN', 'Employee has already clocked in today', 400);
    }

    // Determine if late (e.g., after 09:15 AM)
    const lateThreshold = new Date();
    lateThreshold.setHours(9, 15, 0, 0);
    const status = clockInTime > lateThreshold ? 'Late' : 'Present';

    const query = `
      INSERT INTO hr_attendance (employee_id, date, clock_in, status, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await db.query(query, [employee_id, date, clockInTime, status, notes]);
    sendSuccess(res, result.rows[0], 'Clocked in successfully', 201);
  } catch (error) {
    next(error);
  }
};

const clockOut = async (req, res, next) => {
  try {
    const { employee_id, notes } = req.body;
    const date = new Date().toISOString().split('T')[0];
    const clockOutTime = new Date();

    // Find the record for today
    const checkQuery = `SELECT * FROM hr_attendance WHERE employee_id = $1 AND date = $2`;
    const checkResult = await db.query(checkQuery, [employee_id, date]);

    if (checkResult.rows.length === 0) {
      return sendError(res, 'NOT_CLOCKED_IN', 'Employee has not clocked in today', 400);
    }

    const record = checkResult.rows[0];
    if (record.clock_out) {
      return sendError(res, 'ALREADY_CLOCKED_OUT', 'Employee has already clocked out today', 400);
    }

    // Calculate work hours
    const clockInTime = new Date(record.clock_in);
    const diffMs = clockOutTime - clockInTime;
    const workHours = (diffMs / (1000 * 60 * 60)).toFixed(2); // hours with 2 decimal places

    const updatedNotes = notes ? (record.notes ? record.notes + ' | ' + notes : notes) : record.notes;

    const updateQuery = `
      UPDATE hr_attendance
      SET clock_out = $1, work_hours = $2, notes = $3, updated_at = CURRENT_TIMESTAMP
      WHERE attendance_id = $4
      RETURNING *
    `;

    const result = await db.query(updateQuery, [clockOutTime, workHours, updatedNotes, record.attendance_id]);
    sendSuccess(res, result.rows[0], 'Clocked out successfully');
  } catch (error) {
    next(error);
  }
};

const updateAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { clock_in, clock_out, status, notes } = req.body;

    const checkQuery = `SELECT * FROM hr_attendance WHERE attendance_id = $1`;
    const checkResult = await db.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Attendance record not found', 404);
    }

    // Recalculate work hours if both times are provided
    let workHours = null;
    if (clock_in && clock_out) {
      const diffMs = new Date(clock_out) - new Date(clock_in);
      if (diffMs > 0) {
        workHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
      }
    }

    const updateQuery = `
      UPDATE hr_attendance
      SET 
        clock_in = COALESCE($1, clock_in),
        clock_out = COALESCE($2, clock_out),
        status = COALESCE($3, status),
        work_hours = COALESCE($4, work_hours),
        notes = COALESCE($5, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE attendance_id = $6
      RETURNING *
    `;

    const result = await db.query(updateQuery, [
      clock_in || null,
      clock_out || null,
      status,
      workHours,
      notes,
      id
    ]);

    sendSuccess(res, result.rows[0], 'Attendance record updated successfully');
  } catch (error) {
    next(error);
  }
};

const createManualAttendance = async (req, res, next) => {
  try {
    const { employee_id, date, clock_in, clock_out, status, notes } = req.body;

    const checkQuery = `SELECT * FROM hr_attendance WHERE employee_id = $1 AND date = $2`;
    const checkResult = await db.query(checkQuery, [employee_id, date]);

    if (checkResult.rows.length > 0) {
      return sendError(res, 'DUPLICATE_RECORD', 'Attendance record already exists for this date', 400);
    }

    let workHours = null;
    if (clock_in && clock_out) {
      const diffMs = new Date(clock_out) - new Date(clock_in);
      if (diffMs > 0) {
        workHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
      }
    }

    const query = `
      INSERT INTO hr_attendance (employee_id, date, clock_in, clock_out, status, work_hours, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await db.query(query, [
      employee_id,
      date,
      clock_in || null,
      clock_out || null,
      status || 'Present',
      workHours,
      notes
    ]);

    sendSuccess(res, result.rows[0], 'Attendance record created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const getAttendanceMuster = async (req, res, next) => {
  try {
    const { year, month, department_id } = req.query;
    
    if (!year || !month) {
      return sendError(res, 'BAD_REQUEST', 'Year and month are required', 400);
    }

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    // Get last day of month
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    let empQuery = `
      SELECT e.employee_id, e.emp_code, u.full_name, d.name as department_name, e.employment_status
      FROM hr_employees e
      JOIN users u ON e.user_id = u.user_id
      LEFT JOIN hr_departments d ON e.department_id = d.department_id
      WHERE e.employment_status != 'Terminated'
    `;
    
    const empValues = [];
    if (department_id) {
      empQuery += ` AND e.department_id = $1`;
      empValues.push(department_id);
    }
    
    empQuery += ` ORDER BY u.full_name ASC`;
    
    const employeesRes = await db.query(empQuery, empValues);
    const employees = employeesRes.rows;

    let attQuery = `
      SELECT employee_id, date, status 
      FROM hr_attendance 
      WHERE date >= $1 AND date <= $2
    `;
    const attValues = [startDate, endDate];
    
    const attRes = await db.query(attQuery, attValues);
    const attendanceMap = {};

    const holidaysQuery = `
      SELECT date, name FROM hr_holidays 
      WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2
    `;
    const holidaysRes = await db.query(holidaysQuery, [year, month]);
    const holidayMap = {};
    holidaysRes.rows.forEach(h => {
        const d = new Date(h.date);
        const dateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        const day = parseInt(dateStr.split('-')[2], 10);
        holidayMap[day] = h.name;
    });
    
    attRes.rows.forEach(record => {
      // date is likely a Date object or string. Make sure we use local date carefully.
      const d = new Date(record.date);
      const dateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      const day = parseInt(dateStr.split('-')[2], 10);
      if (!attendanceMap[record.employee_id]) {
        attendanceMap[record.employee_id] = {};
      }
      attendanceMap[record.employee_id][day] = record.status;
    });

    const daysInMonth = new Date(year, month, 0).getDate();
    
    const musterData = employees.map(emp => {
      const records = attendanceMap[emp.employee_id] || {};
      const row = {
        employee_id: emp.employee_id,
        emp_code: emp.emp_code,
        full_name: emp.full_name,
        department_name: emp.department_name,
        days: {}
      };
      
      let present = 0, absent = 0, leave = 0, late = 0, half_day = 0, off = 0, holidayCount = 0, unknown = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month - 1, d);
        const dayOfWeek = dateObj.getDay();
        const isWeekend = dayOfWeek === 0; // Only Sunday is OFF
        const isHoliday = !!holidayMap[d];
        
        let status = records[d];
        
        if (!status) {
          if (isHoliday) {
            status = 'Holiday';
            holidayCount++;
          } else if (isWeekend) {
            status = 'OFF';
            off++;
          } else {
            status = '?';
            unknown++;
          }
        } else {
          if (status === 'Present') present++;
          else if (status === 'Absent') absent++;
          else if (status === 'On Leave') leave++;
          else if (status === 'Late') late++;
          else if (status === 'Half Day') half_day++;
          else if (status === 'Holiday') holidayCount++;
        }
        
        row.days[d] = status;
      }
      
      row.summary = {
        P: present,
        A: absent,
        L: leave,
        Late: late,
        HD: half_day,
        OFF: off,
        H: holidayCount,
        Unknown: unknown 
      };
      return row;
    });

    sendSuccess(res, musterData, 'Muster roll fetched successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAttendance,
  getAttendanceMetrics,
  clockIn,
  clockOut,
  updateAttendance,
  createManualAttendance,
  getAttendanceMuster
};
