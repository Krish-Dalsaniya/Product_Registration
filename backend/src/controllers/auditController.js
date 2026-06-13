const pool = require('../config/db');

exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, action, entityType, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT a.*, u.full_name as user_name, u.email as user_email
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (userId) {
      query += ` AND a.user_id = $${paramIndex++}`;
      params.push(userId);
    }
    if (action) {
      query += ` AND a.action = $${paramIndex++}`;
      params.push(action);
    }
    if (entityType) {
      query += ` AND a.entity_type = $${paramIndex++}`;
      params.push(entityType);
    }
    if (startDate) {
      query += ` AND a.created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND a.created_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    const countQuery = `SELECT COUNT(*) FROM (${query}) AS count_query`;
    const totalResult = await pool.query(countQuery, params);
    const total = parseInt(totalResult.rows[0].count, 10);

    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      logs: result.rows,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Failed to get audit logs:', error);
    res.status(500).json({ message: 'Server error fetching audit logs.' });
  }
};
