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

  // Fallback for removed UI fields
  const final_product_code = product_code || `PRD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const final_unit_price = unit_price || 0;

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
  
  const images = JSON.stringify(imageFiles.map(f => f.path));
  const documents = JSON.stringify(documentFiles.map(f => f.path));
  
  const image_url = imageFiles.length > 0 ? imageFiles[0].path : null;
  const document_url = documentFiles.length > 0 ? documentFiles[0].path : null;

  let faqs = [];
  try { if (req.body.faqs) faqs = JSON.parse(req.body.faqs); } catch(e) {}

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
        faqs,
        image_url,
        document_url,
        images,
        documents
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        product_name, 
        final_product_code, 
        description, 
        final_unit_price,
        category,
        sub_category,
        specification,
        feature,
        JSON.stringify(faqs),
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
    // Fetch existing assets and data to fallback for missing UI fields
    const currentProduct = await db.query('SELECT product_code, unit_price, images, documents FROM products WHERE product_id = $1', [id]);
    if (currentProduct.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }
    const oldCode = currentProduct.rows[0].product_code;
    const oldPrice = currentProduct.rows[0].unit_price;
    const oldImages = currentProduct.rows[0].images || [];
    const oldDocs = currentProduct.rows[0].documents || [];

    const newImageFiles = req.files['image'] || [];
    const newDocFiles = req.files['document'] || [];

    const newImageUrls = newImageFiles.map(f => f.path);
    const newDocUrls = newDocFiles.map(f => f.path);

    const updatedImages = [...oldImages, ...newImageUrls];
    const updatedDocuments = [...oldDocs, ...newDocUrls];

    // Build update query dynamically for assets
    let faqs = [];
    try { if (req.body.faqs) faqs = JSON.parse(req.body.faqs); } catch(e) {}

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
          faqs = $9,
          images = $10,
          documents = $11
    `;
    const params = [
      product_name, 
      product_code || oldCode, 
      description, 
      unit_price || oldPrice || 0, 
      category, 
      sub_category, 
      specification, 
      feature,
      JSON.stringify(faqs),
      JSON.stringify(updatedImages),
      JSON.stringify(updatedDocuments)
    ];

    let paramIdx = 12;
    const finalImageUrl = updatedImages.length > 0 ? updatedImages[0] : null;
    const finalDocUrl = updatedDocuments.length > 0 ? updatedDocuments[0] : null;

    queryText += `, image_url = $${paramIdx++}, document_url = $${paramIdx++}`;
    params.push(finalImageUrl, finalDocUrl);

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

const cloudinary = require('../config/cloudinary');

const removeAsset = async (req, res, next) => {
  const { id } = req.params;
  const { url, type } = req.body; // type: 'images' or 'documents'

  try {
    const product = await db.query(`SELECT ${type} FROM products WHERE product_id = $1`, [id]);
    if (product.rows.length === 0) return res.status(404).json({ success: false, error: { message: 'Product not found' } });

    const currentAssets = product.rows[0][type] || [];
    const updatedAssets = currentAssets.filter(assetUrl => assetUrl !== url);
    const colToUpdate = type === 'images' ? 'image_url' : 'document_url';
    const nextAsset = updatedAssets.length > 0 ? updatedAssets[0] : null;

    await db.query(
      `UPDATE products SET ${type} = $1, ${colToUpdate} = $2 WHERE product_id = $3`, 
      [JSON.stringify(updatedAssets), nextAsset, id]
    );

    // Delete from Cloudinary
    if (url && url.includes('cloudinary.com')) {
      // Extract public_id from URL
      // Example: https://res.cloudinary.com/demo/image/upload/v1571218039/products/images/filename.jpg
      // We need 'products/images/filename'
      const parts = url.split('/');
      const lastPart = parts[parts.length - 1];
      const folderParts = parts.slice(parts.indexOf('upload') + 2, parts.length - 1);
      const publicIdWithExt = [...folderParts, lastPart].join('/');
      const publicId = publicIdWithExt.split('.')[0];
      
      console.log('Attempting to delete Cloudinary asset:', publicId);
      await cloudinary.uploader.destroy(publicId, { resource_type: type === 'images' ? 'image' : 'raw' });
      console.log('Cloudinary asset deleted');
    } else {
      // Fallback for local files (cleanup)
      const filePath = path.join(__dirname, '../../', url);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    sendSuccess(res, { message: 'Asset removed successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteProduct = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'UPDATE products SET is_active = FALSE WHERE product_id = $1 RETURNING product_id, product_name',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }
    sendSuccess(res, { message: `Product "${result.rows[0].product_name}" deleted successfully` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  removeAsset,
  deleteProduct
};
