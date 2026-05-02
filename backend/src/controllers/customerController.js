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
    customer_name,
    company_name,
    company_address,
    company_site_location,
    contact_person_name,
    mobile_no,
    email,
    city,
    state,
    country,
    pincode,
    gst_no,
    status
  } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO customers (
        customer_code, customer_name, company_name, company_address, 
        company_site_location, contact_person_name, mobile_no, email, 
        city, state, country, pincode, gst_no, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) 
      RETURNING *`,
      [
        customer_code, customer_name, company_name, company_address, 
        company_site_location, contact_person_name, mobile_no, email, 
        city, state, country, pincode, gst_no, status || 'Active'
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
    customer_name,
    company_name,
    company_address,
    company_site_location,
    contact_person_name,
    mobile_no,
    email,
    city,
    state,
    country,
    pincode,
    gst_no,
    status
  } = req.body;

  try {
    const result = await db.query(
      `UPDATE customers SET 
        customer_code = $1, customer_name = $2, company_name = $3, company_address = $4, 
        company_site_location = $5, contact_person_name = $6, mobile_no = $7, email = $8, 
        city = $9, state = $10, country = $11, pincode = $12, gst_no = $13, status = $14,
        updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = $15 RETURNING *`,
      [
        customer_code, customer_name, company_name, company_address, 
        company_site_location, contact_person_name, mobile_no, email, 
        city, state, country, pincode, gst_no, status, id
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
