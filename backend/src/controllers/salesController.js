const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

const getProfile = async (req, res, next) => {
  try {
    await db.withSession(req.user.user_id, req.user.role_name, async (client) => {
      const result = await client.query(
        `SELECT sp.*, u.full_name, u.email FROM sales_profiles sp
         JOIN users u ON u.user_id = sp.sales_id
         WHERE sp.sales_id = $1`,
        [req.user.user_id]
      );
      sendSuccess(res, result.rows[0]);
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  const { region, target_revenue } = req.body;
  try {
    await db.withSession(req.user.user_id, req.user.role_name, async (client) => {
      await client.query(
        `UPDATE sales_profiles SET region=$1, target_revenue=$2 WHERE sales_id=$3`,
        [region, target_revenue, req.user.user_id]
      );
      sendSuccess(res, { message: 'Profile updated' });
    });
  } catch (error) {
    next(error);
  }
};

const getProducts = async (req, res, next) => {
  try {
    await db.withSession(req.user.user_id, req.user.role_name, async (client) => {
      const result = await client.query(
        `SELECT * FROM v_my_sales_overview WHERE sales_user_id = $1`,
        [req.user.user_id]
      );
      sendSuccess(res, result.rows);
    });
  } catch (error) {
    next(error);
  }
};

const getOpportunities = async (req, res, next) => {
  const { stage } = req.query;
  try {
    await db.withSession(req.user.user_id, req.user.role_name, async (client) => {
      let queryText = `SELECT so.*, pr.product_name FROM sales_opportunities so
                       JOIN products pr ON pr.product_id = so.product_id
                       WHERE so.sales_id = $1`;
      const params = [req.user.user_id];
      
      if (stage) {
        queryText += ` AND so.stage = $2`;
        params.push(stage);
      }
      
      const result = await client.query(queryText, params);
      sendSuccess(res, result.rows);
    });
  } catch (error) {
    next(error);
  }
};

const createOpportunity = async (req, res, next) => {
  const { product_id, client_name, deal_value, stage, expected_close } = req.body;
  try {
    await db.withSession(req.user.user_id, req.user.role_name, async (client) => {
      const result = await client.query(
        `INSERT INTO sales_opportunities (sales_id, product_id, client_name, deal_value, stage, expected_close)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [req.user.user_id, product_id, client_name, deal_value, stage, expected_close]
      );
      sendSuccess(res, result.rows[0], null, 201);
    });
  } catch (error) {
    next(error);
  }
};

const updateOpportunity = async (req, res, next) => {
  const { id } = req.params;
  const { stage, deal_value, expected_close } = req.body;
  try {
    await db.withSession(req.user.user_id, req.user.role_name, async (client) => {
      const result = await client.query(
        `UPDATE sales_opportunities SET stage=$1, deal_value=$2, expected_close=$3 
         WHERE opportunity_id=$4 AND sales_id=$5 RETURNING *`,
        [stage, deal_value, expected_close, id, req.user.user_id]
      );
      if (result.rowCount === 0) {
        return sendError(res, 'NOT_FOUND', 'Opportunity not found or not owned by you', 404);
      }
      sendSuccess(res, result.rows[0]);
    });
  } catch (error) {
    next(error);
  }
};

const deleteOpportunity = async (req, res, next) => {
  const { id } = req.params;
  try {
    await db.withSession(req.user.user_id, req.user.role_name, async (client) => {
      const result = await client.query(
        `UPDATE sales_opportunities SET closed_at = NOW() 
         WHERE opportunity_id = $1 AND sales_id = $2`,
        [id, req.user.user_id]
      );
      if (result.rowCount === 0) {
        return sendError(res, 'NOT_FOUND', 'Opportunity not found or not owned by you', 404);
      }
      sendSuccess(res, { message: 'Opportunity closed' });
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getProducts,
  getOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity
};
