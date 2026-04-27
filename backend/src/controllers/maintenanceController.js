const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

const getProfile = async (req, res, next) => {
  try {
    await db.withSession(req.user.user_id, req.user.role_name, async (client) => {
      const result = await client.query(
        `SELECT mp.*, u.full_name, u.email FROM maintenance_profiles mp
         JOIN users u ON u.user_id = mp.maintenance_id
         WHERE mp.maintenance_id = $1`,
        [req.user.user_id]
      );
      sendSuccess(res, result.rows[0]);
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  const { certification } = req.body;
  try {
    await db.withSession(req.user.user_id, req.user.role_name, async (client) => {
      await client.query(
        `UPDATE maintenance_profiles SET certification=$1 WHERE maintenance_id=$2`,
        [certification, req.user.user_id]
      );
      sendSuccess(res, { message: 'Profile updated' });
    });
  } catch (error) {
    next(error);
  }
};

const getTasks = async (req, res, next) => {
  const { status } = req.query;
  try {
    await db.withSession(req.user.user_id, req.user.role_name, async (client) => {
      let queryText = `SELECT * FROM v_my_maintenance_overview WHERE staff_user_id = $1`;
      const params = [req.user.user_id];
      
      if (status) {
        queryText += ` AND task_status = $2`;
        params.push(status);
      }
      
      const result = await client.query(queryText, params);
      sendSuccess(res, result.rows);
    });
  } catch (error) {
    next(error);
  }
};

const getTaskById = async (req, res, next) => {
  const { taskId } = req.params;
  try {
    await db.withSession(req.user.user_id, req.user.role_name, async (client) => {
      const result = await client.query(
        `SELECT mt.*, mr.record_title, mr.scheduled_date, pr.product_name, pr.product_code
         FROM maintenance_tasks mt
         JOIN maintenance_records mr ON mr.record_id = mt.record_id
         JOIN products pr ON pr.product_id = mr.product_id
         WHERE mt.task_id = $1 AND mt.maintenance_id = $2`,
        [taskId, req.user.user_id]
      );
      if (result.rowCount === 0) {
        return sendError(res, 'NOT_FOUND', 'Task not found', 404);
      }
      sendSuccess(res, result.rows[0]);
    });
  } catch (error) {
    next(error);
  }
};

const updateTaskStatus = async (req, res, next) => {
  const { taskId } = req.params;
  const { status } = req.body;
  try {
    await db.withSession(req.user.user_id, req.user.role_name, async (client) => {
      let queryText = `UPDATE maintenance_tasks SET status=$1`;
      const params = [status, taskId, req.user.user_id];
      
      if (status === 'Done') {
        queryText += `, completed_at = NOW()`;
      }
      
      queryText += ` WHERE task_id = $2 AND maintenance_id = $3 RETURNING *`;
      
      const result = await client.query(queryText, params);
      if (result.rowCount === 0) {
        return sendError(res, 'NOT_FOUND', 'Task not found', 404);
      }
      sendSuccess(res, result.rows[0]);
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getTasks,
  getTaskById,
  updateTaskStatus
};
