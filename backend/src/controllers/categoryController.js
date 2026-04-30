const db = require('../config/db');
const { sendSuccess } = require('../utils/response');

const getCategories = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT c.*, COUNT(sc.id) as sub_category_count 
      FROM product_categories c 
      LEFT JOIN product_sub_categories sc ON c.id = sc.category_id 
      GROUP BY c.id 
      ORDER BY c.name ASC
    `);
    sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
};

const getSubCategories = async (req, res, next) => {
  const { categoryId } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM product_sub_categories WHERE category_id = $1 ORDER BY name ASC',
      [categoryId]
    );
    sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  const { name } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO product_categories (name) VALUES ($1) RETURNING *',
      [name]
    );
    sendSuccess(res, result.rows[0], null, 201);
  } catch (error) {
    next(error);
  }
};

const createSubCategory = async (req, res, next) => {
  const { categoryId } = req.params;
  const { name } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO product_sub_categories (category_id, name) VALUES ($1, $2) RETURNING *',
      [categoryId, name]
    );
    sendSuccess(res, result.rows[0], null, 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getSubCategories,
  createCategory,
  createSubCategory
};
