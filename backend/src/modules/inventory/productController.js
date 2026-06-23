const db = require('../../config/db');
const path = require('path');
const fs = require('fs');
const { sendSuccess } = require('../../utils/response');
const { parsePagination } = require('../../utils/pagination');
const { uploadQueue, queueEvents } = require('../../queues/uploadQueue');

/**
 * Uploads an array of files to Cloudinary via a BullMQ background queue.
 * Handles both new file uploads and existing remote URLs.
 * 
 * @param {Array<Object|string>} files - Array of multer file objects or string URLs
 * @param {'image'|'document'} type - Type of asset being uploaded
 * @returns {Promise<Array<string>>} Promise resolving to an array of uploaded file URLs
 */
const processUploads = async (files, type) => {
  if (!files || files.length === 0) return [];
  
  const uploadPromises = files.map(async (file) => {
    // If already a remote URL (for updates), keep it
    if (file.path && file.path.startsWith('http')) return file.path;
    if (typeof file === 'string' && file.startsWith('http')) return file;
    if (file.url && file.url.startsWith('http')) return file.url;

    const isImage = type === 'image';
    const job = await uploadQueue.add('upload', {
      filePath: file.path,
      folder: isImage ? 'products/images' : 'products/documents',
      resourceType: isImage ? 'image' : 'raw'
    });
    
    const url = await job.waitUntilFinished(queueEvents);
    return url;
  });
  
  return Promise.all(uploadPromises);
};

const getProducts = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req);
  const { search, category, company } = req.query;

  try {
    let baseQuery = `FROM products WHERE is_active = TRUE`;
    const params = [];
    let paramIdx = 1;

    if (search) {
      baseQuery += ` AND (product_name ILIKE $${paramIdx} OR product_code ILIKE $${paramIdx} OR company_name ILIKE $${paramIdx})`;
      params.push(`%${search}%`);
      paramIdx++;
    }

    if (category) {
      baseQuery += ` AND category = $${paramIdx}`;
      params.push(category);
      paramIdx++;
    }
    
    if (company) {
      baseQuery += ` AND company_name = $${paramIdx}`;
      params.push(company);
      paramIdx++;
    }

    const countQuery = `SELECT COUNT(*) ${baseQuery}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `SELECT *, COALESCE((SELECT SUM(quantity) FROM finished_goods fg WHERE fg.product_id = products.product_id), 0) AS stock_quantity ${baseQuery} ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
    const dataParams = [...params, limit, offset];

    const result = await db.query(dataQuery, dataParams);

    sendSuccess(res, result.rows, { page, limit, total });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM products WHERE product_id = $1 AND is_active = TRUE', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }
    sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const createProduct = async (req, res, next) => {
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
    dispensing,
    company_name,
    sub_company
  } = req.body;

  const formatFilePath = (file) => {
    if (!file) return null;
    // If it's a Cloudinary URL or already starts with /, return as is
    if (file.path.startsWith('http') || file.path.startsWith('/')) return file.path;
    // Otherwise format local path
    return `/uploads/${file.filename}`;
  };

  // Fallback for removed UI fields
  const final_product_code = product_code || `PRD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const final_unit_price = unit_price || 0;

  let specification = req.body.specification;

  const imageFiles = req.files['image'] || [];
  const documentFiles = req.files['document'] || [];
  
  let uploadedImageUrls = [];
  let uploadedDocumentUrls = [];

  try {
    uploadedImageUrls = await processUploads(imageFiles, 'image');
    uploadedDocumentUrls = await processUploads(documentFiles, 'document');
  } catch (uploadError) {
    console.error("Queue upload failed:", uploadError);
    return res.status(500).json({ success: false, error: { message: 'Image upload failed. Please try again.' } });
  }

  const images = JSON.stringify(uploadedImageUrls);
  const documents = JSON.stringify(uploadedDocumentUrls.map((url, idx) => ({
    url: url,
    name: req.body.document_label || documentFiles[idx].originalname
  })));
  
  const image_url = uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : null;
  const document_url = uploadedDocumentUrls.length > 0 ? uploadedDocumentUrls[0] : null;

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
        documents,
        company_name,
        sub_company
      ) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
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
        documents,
        company_name,
        sub_company
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
    dispensing,
    company_name,
    sub_company
  } = req.body;

  let specification = req.body.specification;

  try {
    // Fetch existing assets and data to fallback for missing UI fields
    const currentProduct = await db.query('SELECT product_code, unit_price, company_name, sub_company, images, documents FROM products WHERE product_id = $1', [id]);
    if (currentProduct.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }
    const oldCode = currentProduct.rows[0].product_code;
    const oldPrice = currentProduct.rows[0].unit_price;
    const oldCompany = currentProduct.rows[0].company_name;
    const oldSubCompany = currentProduct.rows[0].sub_company;
    const oldImages = currentProduct.rows[0].images || [];
    const oldDocs = currentProduct.rows[0].documents || [];

    const formatFilePath = (file) => {
        if (!file) return null;
        if (file.path.startsWith('http') || file.path.startsWith('/')) return file.path;
        return `/uploads/${file.filename}`;
    };

    const newImageFiles = req.files['image'] || [];
    const newDocFiles = req.files['document'] || [];

    let newImageUrls = [];
    let newDocUrls = [];

    try {
      newImageUrls = await processUploads(newImageFiles, 'image');
      newDocUrls = await processUploads(newDocFiles, 'document');
    } catch (uploadError) {
      console.error("Queue upload failed:", uploadError);
      return res.status(500).json({ success: false, error: { message: 'Image upload failed. Please try again.' } });
    }

    const newDocObjects = newDocUrls.map((url, idx) => ({
      url: url,
      name: req.body.document_label || newDocFiles[idx].originalname
    }));

    // Normalize old documents to object format
    const oldDocsNormalized = oldDocs.map(item => 
      typeof item === 'string' ? { url: item, name: item.split('/').pop() } : item
    );

    const updatedImages = [...oldImages, ...newImageUrls];
    const updatedDocuments = [...oldDocsNormalized, ...newDocObjects];

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
          documents = $11,
          company_name = $12,
          sub_company = $13
    `;
    const params = [
      product_name, 
      product_code || oldCode, 
      description, 
      unit_price !== undefined ? unit_price : (oldPrice || 0), 
      category, 
      sub_category, 
      specification, 
      feature,
      JSON.stringify(faqs),
      JSON.stringify(updatedImages),
      JSON.stringify(updatedDocuments),
      company_name !== undefined ? company_name : oldCompany,
      sub_company !== undefined ? sub_company : oldSubCompany
    ];

    let paramIdx = 14;
    const finalImageUrl = updatedImages.length > 0 ? updatedImages[0] : null;
    const finalDocUrl = updatedDocuments.length > 0 
      ? (typeof updatedDocuments[0] === 'string' ? updatedDocuments[0] : updatedDocuments[0].url) 
      : null;

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

const cloudinary = require('../../config/cloudinary');

const removeAsset = async (req, res, next) => {
  const { id } = req.params;
  const { url, type } = req.body; // type: 'images' or 'documents'

  try {
    if (type !== 'images' && type !== 'documents') {
      return res.status(400).json({ success: false, error: { message: 'Invalid asset type' } });
    }

    const product = await db.query(`SELECT ${type} FROM products WHERE product_id = $1`, [id]);
    if (product.rows.length === 0) return res.status(404).json({ success: false, error: { message: 'Product not found' } });

    const currentAssets = product.rows[0][type] || [];
    const updatedAssets = currentAssets.filter(asset => {
      const assetUrl = typeof asset === 'string' ? asset : asset.url;
      return assetUrl !== url;
    });
    const colToUpdate = type === 'images' ? 'image_url' : 'document_url';
    let nextAsset = updatedAssets.length > 0 ? updatedAssets[0] : null;
    if (nextAsset && typeof nextAsset === 'object') {
      nextAsset = nextAsset.url;
    }

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

// ── Bill of Material ─────────────────────────────────────────────────────────

const getBomOptions = async (req, res, next) => {
  try {
    const [pcbs, electrical, electronics, structural] = await Promise.all([
      db.query(`
        SELECT pcb_id AS id, TRIM(part_no) AS name
        FROM pcb_master
        WHERE is_active = TRUE AND part_no IS NOT NULL AND TRIM(part_no) != ''
        ORDER BY LOWER(TRIM(part_no))
      `),
      db.query(`
        SELECT part_id AS id,
               TRIM(part_name) || CASE WHEN part_number IS NOT NULL AND TRIM(part_number) != ''
                 THEN ' (' || TRIM(part_number) || ')' ELSE '' END AS name
        FROM electrical_part_master
        WHERE is_active = TRUE AND part_name IS NOT NULL AND TRIM(part_name) != ''
        ORDER BY LOWER(TRIM(part_name))
      `),
      db.query(`
        SELECT part_id AS id,
               TRIM(part_name) || CASE WHEN part_number IS NOT NULL AND TRIM(part_number) != ''
                 THEN ' (' || TRIM(part_number) || ')' ELSE '' END AS name
        FROM electronics_part_master
        WHERE is_active = TRUE AND part_name IS NOT NULL AND TRIM(part_name) != ''
        ORDER BY LOWER(TRIM(part_name))
      `),
      db.query(`
        SELECT part_id AS id,
               TRIM(part_name) || CASE WHEN part_number IS NOT NULL AND TRIM(part_number) != ''
                 THEN ' (' || TRIM(part_number) || ')' ELSE '' END AS name
        FROM structural_part_master
        WHERE is_active = TRUE AND part_name IS NOT NULL AND TRIM(part_name) != ''
        ORDER BY LOWER(TRIM(part_name))
      `)
    ]);

    sendSuccess(res, {
      pcb: pcbs.rows,
      electrical: electrical.rows,
      electronics: electronics.rows,
      structural: structural.rows
    });
  } catch (error) {
    next(error);
  }
};

const getProductBom = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT bom_id, component_type, component_id, quantity, notes
       FROM product_bom WHERE product_id = $1 ORDER BY component_type, bom_id`,
      [id]
    );
    sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
};

const saveProductBom = async (req, res, next) => {
  const { id } = req.params;
  const { items } = req.body; // [{component_type, component_id, quantity, notes}]

  if (!Array.isArray(items)) {
    return res.status(400).json({ success: false, error: { message: 'items must be an array' } });
  }

  try {
    await db.withTransaction(async (client) => {
      await client.query('DELETE FROM product_bom WHERE product_id = $1', [id]);

      for (const item of items) {
        await client.query(
          `INSERT INTO product_bom (product_id, component_type, component_id, quantity, notes)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, item.component_type, item.component_id, item.quantity || 1, item.notes || null]
        );
      }
    });
    sendSuccess(res, null, 'Bill of Material saved successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  removeAsset,
  deleteProduct,
  getBomOptions,
  getProductBom,
  saveProductBom
};
