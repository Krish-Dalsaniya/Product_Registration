const db = require('../config/db');
const { sendSuccess } = require('../utils/response');
const { parsePagination } = require('../utils/pagination');

const getProducts = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req);
  const { search } = req.query;

  try {
    let queryText = `SELECT *, COUNT(*) OVER() as total_count FROM products WHERE is_active = TRUE`;
    const params = [limit, offset];

    if (search) {
      queryText += ` AND (product_name ILIKE $3 OR product_code ILIKE $3)`;
      params.push(`%${search}%`);
    }

    queryText += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`;

    const result = await db.query(queryText, params);
    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    sendSuccess(res, result.rows.map(({ total_count, ...rest }) => rest), { page, limit, total });
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
  console.log('Incoming Product Data:', req.body);
  const { 
    product_name, 
    product_code, 
    description, 
    unit_price,
    category,
    sub_category,
    feature,
    fuel_types,
    nozzles,
    dispensing
  } = req.body;

  let specification = req.body.specification;
  const isDispenser = category?.toLowerCase() === 'dispenser' || sub_category?.toLowerCase() === 'dispenser';
  
  if (isDispenser) {
    specification = JSON.stringify({
      fuel_types: Array.isArray(fuel_types) ? fuel_types : (fuel_types ? [fuel_types] : []),
      nozzles,
      dispensing,
      original_spec: specification
    });
  }

  const image_url = req.files['image'] ? `/uploads/${req.files['image'][0].filename}` : null;
  const document_url = req.files['document'] ? `/uploads/${req.files['document'][0].filename}` : null;

  try {
    const result = await db.query(
      `INSERT INTO products (
        product_name, 
        product_code, 
        description, 
        unit_price,
        category,
        sub_category,
        specification,
        feature,
        image_url,
        document_url
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        product_name, 
        product_code, 
        description, 
        unit_price || 0,
        category,
        sub_category,
        specification,
        feature,
        image_url,
        document_url
      ]
    );

    sendSuccess(res, result.rows[0], null, 201);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: { message: 'Product code already exists' } });
    }
    next(error);
  }
};

const updateProduct = async (req, res, next) => {
  const { id } = req.params;
  const { 
    product_name, 
    product_code, 
    description, 
    unit_price,
    category,
    sub_category,
    feature,
    fuel_types,
    nozzles,
    dispensing
  } = req.body;

  let specification = req.body.specification;
  const isDispenser = category?.toLowerCase() === 'dispenser' || sub_category?.toLowerCase() === 'dispenser';
  
  if (isDispenser) {
    specification = JSON.stringify({
      fuel_types: Array.isArray(fuel_types) ? fuel_types : (fuel_types ? [fuel_types] : []),
      nozzles,
      dispensing,
      original_spec: specification
    });
  }

  try {
    // Build update query dynamically for assets
    let queryText = `
      UPDATE products 
      SET product_name = $1, 
          product_code = $2, 
          description = $3, 
          unit_price = $4,
          category = $5,
          sub_category = $6,
          specification = $7,
          feature = $8
    `;
    const params = [product_name, product_code, description, unit_price || 0, category, sub_category, specification, feature];

    let paramIdx = 9;
    if (req.files['image']) {
      queryText += `, image_url = $${paramIdx++}`;
      params.push(`/uploads/${req.files['image'][0].filename}`);
    }
    if (req.files['document']) {
      queryText += `, document_url = $${paramIdx++}`;
      params.push(`/uploads/${req.files['document'][0].filename}`);
    }

    queryText += ` WHERE product_id = $${paramIdx} RETURNING *`;
    params.push(id);

    const result = await db.query(queryText, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }

    sendSuccess(res, result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: { message: 'Product code already exists' } });
    }
    next(error);
  }
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct
};
