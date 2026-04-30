const db = require('../config/db');
const path = require('path');
const fs = require('fs');
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

  const imageFiles = req.files['image'] || [];
  const documentFiles = req.files['document'] || [];
  
  const images = JSON.stringify(imageFiles.map(f => `/uploads/${f.filename}`));
  const documents = JSON.stringify(documentFiles.map(f => `/uploads/${f.filename}`));
  
  const image_url = imageFiles.length > 0 ? `/uploads/${imageFiles[0].filename}` : null;
  const document_url = documentFiles.length > 0 ? `/uploads/${documentFiles[0].filename}` : null;

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
        document_url,
        images,
        documents
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
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
        document_url,
        images,
        documents
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
    // Fetch existing assets to append
    const currentProduct = await db.query('SELECT images, documents FROM products WHERE product_id = $1', [id]);
    const oldImages = currentProduct.rows[0]?.images || [];
    const oldDocs = currentProduct.rows[0]?.documents || [];

    const newImageFiles = req.files['image'] || [];
    const newDocFiles = req.files['document'] || [];

    const newImageUrls = newImageFiles.map(f => `/uploads/${f.filename}`);
    const newDocUrls = newDocFiles.map(f => `/uploads/${f.filename}`);

    const updatedImages = [...oldImages, ...newImageUrls];
    const updatedDocuments = [...oldDocs, ...newDocUrls];

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
          feature = $8,
          images = $9,
          documents = $10
    `;
    const params = [
      product_name, 
      product_code, 
      description, 
      unit_price || 0, 
      category, 
      sub_category, 
      specification, 
      feature,
      JSON.stringify(updatedImages),
      JSON.stringify(updatedDocuments)
    ];

    let paramIdx = 11;
    if (newImageUrls.length > 0) {
      queryText += `, image_url = $${paramIdx++}`;
      params.push(newImageUrls[0]);
    }
    if (newDocUrls.length > 0) {
      queryText += `, document_url = $${paramIdx++}`;
      params.push(newDocUrls[0]);
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

const removeAsset = async (req, res, next) => {
  const { id } = req.params;
  const { url, type } = req.body; // type: 'images' or 'documents'

  try {
    const product = await db.query(`SELECT ${type} FROM products WHERE product_id = $1`, [id]);
    if (product.rows.length === 0) return res.status(404).json({ success: false, error: { message: 'Product not found' } });

    const currentAssets = product.rows[0][type] || [];
    const updatedAssets = currentAssets.filter(assetUrl => assetUrl !== url);

    await db.query(`UPDATE products SET ${type} = $1 WHERE product_id = $2`, [JSON.stringify(updatedAssets), id]);

    // Physically delete file
    const filePath = path.join(__dirname, '../../', url);
    console.log('Attempting to delete file at:', filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('File deleted successfully');
    } else {
      console.warn('File not found on disk:', filePath);
    }

    sendSuccess(res, { message: 'Asset removed successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  removeAsset
};
