const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

const getCustomers = async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM customers ORDER BY created_at DESC');
    sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
};

const getCustomerById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM customers WHERE customer_id = $1', [id]);
    if (result.rows.length === 0) {
      return sendError(res, 'NOT_FOUND', 'Customer not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const createCustomer = async (req, res, next) => {
  const {
    customer_code,
    first_name,
    middle_name,
    last_name,
    company_name,
    company_address,
    billing_address,
    shipping_address,
    customer_site_location,
    technical_contacts,
    sales_contacts,
    udyam_aadhar_no,
    email,
    city,
    state,
    country,
    pincode,
    gst_no,
    status,
    company_type
  } = req.body;

  const customer_name = [first_name, middle_name, last_name].filter(Boolean).join(' ');

  try {
    const result = await db.query(
      `INSERT INTO customers (
        customer_code, customer_name, first_name, middle_name, last_name,
        company_name, company_address, billing_address, shipping_address,
        customer_site_location, technical_contacts, sales_contacts, udyam_aadhar_no,
        email, city, state, country, pincode, gst_no, status, company_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) 
      RETURNING *`,
      [
        customer_code, customer_name, first_name, middle_name, last_name,
        company_name, company_address, billing_address, shipping_address,
        customer_site_location, 
        JSON.stringify(technical_contacts || []), 
        JSON.stringify(sales_contacts || []), 
        udyam_aadhar_no,
        email, city, state, country, pincode, gst_no, status || 'Active',
        company_type
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
    company_address,
    billing_address,
    shipping_address,
    customer_site_location,
    technical_contacts,
    sales_contacts,
    udyam_aadhar_no,
    email,
    city,
    state,
    country,
    pincode,
    gst_no,
    status,
    company_type
  } = req.body;
  
  console.log('Update Request for ID:', id, 'Company Type:', company_type);

  const customer_name = [first_name, middle_name, last_name].filter(Boolean).join(' ');

  try {
    const result = await db.query(
      `UPDATE customers SET 
        customer_code = $1, customer_name = $2, first_name = $3, middle_name = $4, last_name = $5,
        company_name = $6, company_address = $7, billing_address = $8, shipping_address = $9,
        customer_site_location = $10, technical_contacts = $11, sales_contacts = $12,
        udyam_aadhar_no = $13, email = $14, city = $15, state = $16, country = $17, pincode = $18, 
        gst_no = $19, status = $20, company_type = $21, updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = $22 RETURNING *`,
      [
        customer_code, customer_name, first_name, middle_name, last_name,
        company_name, company_address, billing_address, shipping_address,
        customer_site_location, 
        JSON.stringify(technical_contacts || []), 
        JSON.stringify(sales_contacts || []),
        udyam_aadhar_no,
        email, city, state, country, pincode, gst_no, status, 
        company_type || null, 
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
