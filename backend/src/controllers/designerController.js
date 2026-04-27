const db = require('../config/db');
const { sendSuccess } = require('../utils/response');

const getProfile = async (req, res, next) => {
  try {
    await db.withSession(req.user.user_id, req.user.role_name, async (client) => {
      const result = await client.query(
        `SELECT dp.*, u.full_name, u.email FROM designer_profiles dp
         JOIN users u ON u.user_id = dp.designer_id
         WHERE dp.designer_id = $1`,
        [req.user.user_id]
      );
      sendSuccess(res, result.rows[0]);
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  const { specialty, portfolio_url, availability } = req.body;
  try {
    await db.withSession(req.user.user_id, req.user.role_name, async (client) => {
      await client.query(
        `UPDATE designer_profiles SET specialty=$1, portfolio_url=$2, availability=$3 WHERE designer_id=$4`,
        [specialty, portfolio_url, availability, req.user.user_id]
      );
      sendSuccess(res, { message: 'Profile updated' });
    });
  } catch (error) {
    next(error);
  }
};

const getTeam = async (req, res, next) => {
  try {
    await db.withSession(req.user.user_id, req.user.role_name, async (client) => {
      const result = await client.query(
        `SELECT t.*, tm.is_lead, tm.joined_at FROM teams t
         JOIN team_members tm ON tm.team_id = t.team_id
         WHERE tm.designer_id = $1`,
        [req.user.user_id]
      );
      sendSuccess(res, result.rows[0]);
    });
  } catch (error) {
    next(error);
  }
};

const getProjects = async (req, res, next) => {
  try {
    await db.withSession(req.user.user_id, req.user.role_name, async (client) => {
      const result = await client.query(
        `SELECT * FROM v_designer_project_overview WHERE designer_user_id = $1`,
        [req.user.user_id]
      );
      sendSuccess(res, result.rows);
    });
  } catch (error) {
    next(error);
  }
};

const getProjectById = async (req, res, next) => {
  const { projectId } = req.params;
  try {
    await db.withSession(req.user.user_id, req.user.role_name, async (client) => {
      const result = await client.query(
        `SELECT p.*, pr.product_name, pr.product_code FROM projects p
         LEFT JOIN products pr ON pr.product_id = p.product_id
         WHERE p.project_id = $1`,
        [projectId]
      );
      sendSuccess(res, result.rows[0]);
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getTeam,
  getProjects,
  getProjectById
};
