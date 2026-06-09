const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

const getCustomers = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT c.*, 
        (
          SELECT string_agg(DISTINCT p.product_name, ', ') 
          FROM book_a_sale bas 
          JOIN finished_goods fg ON bas.finished_good_id = fg.id 
          JOIN products p ON fg.product_id = p.product_id 
          WHERE bas.customer_id = c.customer_id
        ) AS derived_product
      FROM customers c 
      ORDER BY c.created_at DESC
    `);
    
    const rows = result.rows.map(row => ({
      ...row,
      product: row.derived_product || ''
    }));
    
    sendSuccess(res, rows);
  } catch (error) {
    next(error);
  }
};

const getCustomerById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await db.query(`
      SELECT c.*, 
        (
          SELECT string_agg(DISTINCT p.product_name, ', ') 
          FROM book_a_sale bas 
          JOIN finished_goods fg ON bas.finished_good_id = fg.id 
          JOIN products p ON fg.product_id = p.product_id 
          WHERE bas.customer_id = c.customer_id
        ) AS derived_product
      FROM customers c 
      WHERE c.customer_id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Customer not found', 404);
    }
    
    const row = result.rows[0];
    row.product = row.derived_product || '';
    
    sendSuccess(res, row);
  } catch (error) {
    next(error);
  }
};

const createCustomer = async (req, res, next) => {
  const userId = req.user ? req.user.user_id : null;
  const {
    customer_code,
    first_name,
    middle_name,
    last_name,
    company_name,
    customer_site_location,
    technical_contacts,
    sales_contacts,
    owner_contacts,
    accounts_contacts,
    qa_qc_contacts,
    other_contacts,
    addresses,
    udyam_aadhar_no,
    email,
    gst_no,
    status,
    company_type,
    product,
    product_promoted,
    product_inquired,
    product_quoted,
    product_sampled,
    product_purchased
  } = req.body;

  const customer_name = [first_name, middle_name, last_name].filter(Boolean).join(' ');

  try {
    const result = await db.query(
      `INSERT INTO customers (
        customer_code, customer_name, first_name, middle_name, last_name,
        company_name, customer_site_location, technical_contacts, sales_contacts,
        owner_contacts, accounts_contacts, qa_qc_contacts, other_contacts,
        addresses, udyam_aadhar_no,
        email, gst_no, status, company_type, product,
        product_promoted, product_inquired, product_quoted, product_sampled, product_purchased, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26) 
      RETURNING *`,
      [
        customer_code, customer_name, first_name, middle_name, last_name,
        company_name,
        customer_site_location, 
        JSON.stringify(technical_contacts || []), 
        JSON.stringify(sales_contacts || []), 
        JSON.stringify(owner_contacts || []), 
        JSON.stringify(accounts_contacts || []), 
        JSON.stringify(qa_qc_contacts || []), 
        JSON.stringify(other_contacts || []), 
        JSON.stringify(addresses || []),
        udyam_aadhar_no,
        email, gst_no, status || 'Active',
        company_type,
        product,
        product_promoted || false,
        product_inquired || false,
        product_quoted || false,
        product_sampled || false,
        product_purchased || false,
        userId
      ]
    );
    sendSuccess(res, result.rows[0], 201);
  } catch (error) {
    if (error.code === '23505') {
      return sendError(res, 'CONFLICT', 'Customer code already exists', 409);
    }
    next(error);
  }
};

const updateCustomer = async (req, res, next) => {
  const { id } = req.params;
  const {
    customer_code,
    first_name,
    middle_name,
    last_name,
    company_name,
    customer_site_location,
    technical_contacts,
    sales_contacts,
    owner_contacts,
    accounts_contacts,
    qa_qc_contacts,
    other_contacts,
    addresses,
    udyam_aadhar_no,
    email,
    gst_no,
    status,
    company_type,
    product,
    product_promoted,
    product_inquired,
    product_quoted,
    product_sampled,
    product_purchased
  } = req.body;
  
  console.log('Update Request for ID:', id, 'Company Type:', company_type);

  const customer_name = [first_name, middle_name, last_name].filter(Boolean).join(' ');

  try {
    const result = await db.query(
      `UPDATE customers SET 
        customer_code = $1, customer_name = $2, first_name = $3, middle_name = $4, last_name = $5,
        company_name = $6, customer_site_location = $7, 
        technical_contacts = $8, sales_contacts = $9, 
        owner_contacts = $10, accounts_contacts = $11, qa_qc_contacts = $12, other_contacts = $13,
        addresses = $14, udyam_aadhar_no = $15, email = $16, gst_no = $17, status = $18, company_type = $19, product = $20, 
        product_promoted = $21, product_inquired = $22, product_quoted = $23, product_sampled = $24, product_purchased = $25, updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = $26 RETURNING *`,
      [
        customer_code, customer_name, first_name, middle_name, last_name,
        company_name,
        customer_site_location, 
        JSON.stringify(technical_contacts || []), 
        JSON.stringify(sales_contacts || []),
        JSON.stringify(owner_contacts || []),
        JSON.stringify(accounts_contacts || []),
        JSON.stringify(qa_qc_contacts || []),
        JSON.stringify(other_contacts || []),
        JSON.stringify(addresses || []),
        udyam_aadhar_no,
        email, gst_no, status, 
        company_type || null, 
        product,
        product_promoted || false,
        product_inquired || false,
        product_quoted || false,
        product_sampled || false,
        product_purchased || false,
        id
      ]
    );
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Customer not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const deleteCustomer = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM customers WHERE customer_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Customer not found', 404);
    }
    sendSuccess(res, { message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer
};
