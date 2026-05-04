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
    customer_site_location,
    technical_contact_person,
    technical_contact_mobile,
    accounts_contact_person,
    accounts_contact_mobile,
    udyam_aadhar_no,
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
        customer_site_location, technical_contact_person, technical_contact_mobile,
        accounts_contact_person, accounts_contact_mobile, udyam_aadhar_no,
        email, city, state, country, pincode, gst_no, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) 
      RETURNING *`,
      [
        customer_code, customer_name, company_name, company_address, 
        customer_site_location, technical_contact_person, technical_contact_mobile,
        accounts_contact_person, accounts_contact_mobile, udyam_aadhar_no,
        email, city, state, country, pincode, gst_no, status || 'Active'
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
    customer_site_location,
    technical_contact_person,
    technical_contact_mobile,
    accounts_contact_person,
    accounts_contact_mobile,
    udyam_aadhar_no,
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
        customer_site_location = $5, technical_contact_person = $6, technical_contact_mobile = $7,
        accounts_contact_person = $8, accounts_contact_mobile = $9, udyam_aadhar_no = $10,
        email = $11, city = $12, state = $13, country = $14, pincode = $15, gst_no = $16, status = $17,
        updated_at = CURRENT_TIMESTAMP
      WHERE customer_id = $18 RETURNING *`,
      [
        customer_code, customer_name, company_name, company_address, 
        customer_site_location, technical_contact_person, technical_contact_mobile,
        accounts_contact_person, accounts_contact_mobile, udyam_aadhar_no,
        email, city, state, country, pincode, gst_no, status, id
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
