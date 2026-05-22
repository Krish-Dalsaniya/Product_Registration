const db = require('../config/db');
const { sendSuccess } = require('../utils/response');

/**
 * GET /api/inventory/:module/categories/:categoryName/fields
 * Returns the custom field definitions for a given module + category.
 */
const getCategoryFields = async (req, res, next) => {
  const { module, categoryName } = req.params;
  try {
    const result = await db.query(
      `SELECT fields FROM inventory_custom_category_fields WHERE module = $1 AND category_name = $2`,
      [module, categoryName]
    );
    sendSuccess(res, { fields: result.rows[0]?.fields || [] });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/inventory/:module/categories/:categoryName/fields
 * Saves (upserts) the custom field definitions for a given module + category.
 * Body: { fields: [{ label: string, key: string }, ...] }
 */
const saveCategoryFields = async (req, res, next) => {
  const { module, categoryName } = req.params;
  const { fields } = req.body;

  if (!Array.isArray(fields)) {
    return res.status(400).json({ success: false, error: { message: 'fields must be an array' } });
  }

  try {
    await db.query(
      `INSERT INTO inventory_custom_category_fields (module, category_name, fields, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (module, category_name)
       DO UPDATE SET fields = $3, updated_at = NOW()`,
      [module, categoryName, JSON.stringify(fields)]
    );
    sendSuccess(res, { fields }, 'Custom category fields saved');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inventory/:module/custom-categories
 * Returns all custom category names saved for this module.
 */
const getCustomCategories = async (req, res, next) => {
  const { module } = req.params;
  try {
    const result = await db.query(
      `SELECT category_name, fields FROM inventory_custom_category_fields WHERE module = $1 ORDER BY created_at ASC`,
      [module]
    );
    sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/inventory/:module/categories/:categoryName
 * Deletes the custom field definitions for a module + category.
 */
const deleteCustomCategory = async (req, res, next) => {
  const { module, categoryName } = req.params;
  try {
    await db.query(
      `DELETE FROM inventory_custom_category_fields WHERE module = $1 AND category_name = $2`,
      [module, categoryName]
    );
    sendSuccess(res, null, 'Custom category deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategoryFields,
  saveCategoryFields,
  getCustomCategories,
  deleteCustomCategory,
};
