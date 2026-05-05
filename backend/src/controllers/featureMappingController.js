const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

const getFeatureMappings = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM feature_mappings ORDER BY created_at DESC');
    sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
};

const createFeatureMapping = async (req, res, next) => {
  const { mapping_name, hardware_features, software_features } = req.body;
  try {
    const result = await db.query(
      `INSERT INTO feature_mappings (mapping_name, hardware_features, software_features) 
       VALUES ($1, $2, $3) RETURNING *`,
      [mapping_name, JSON.stringify(hardware_features || []), JSON.stringify(software_features || [])]
    );
    sendSuccess(res, result.rows[0], 201);
  } catch (error) {
    next(error);
  }
};

const updateFeatureMapping = async (req, res, next) => {
  const { id } = req.params;
  const { mapping_name, hardware_features, software_features } = req.body;
  try {
    const result = await db.query(
      `UPDATE feature_mappings SET mapping_name = $1, hardware_features = $2, software_features = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE mapping_id = $4 RETURNING *`,
      [mapping_name, JSON.stringify(hardware_features || []), JSON.stringify(software_features || []), id]
    );
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Feature Mapping not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const deleteFeatureMapping = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM feature_mappings WHERE mapping_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Feature Mapping not found', 404);
    }
    sendSuccess(res, { message: 'Deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFeatureMappings,
  createFeatureMapping,
  updateFeatureMapping,
  deleteFeatureMapping
};
