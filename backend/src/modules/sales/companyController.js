const db = require('../../config/db');
const { sendSuccess } = require('../../utils/response');

const getCompanies = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT c.*, COUNT(sc.id) as sub_company_count 
      FROM product_companies c 
      LEFT JOIN product_sub_companies sc ON c.id = sc.company_id 
      GROUP BY c.id 
      ORDER BY c.name ASC
    `);
    sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
};

const getSubCompanies = async (req, res, next) => {
  const { companyId } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM product_sub_companies WHERE company_id = $1 ORDER BY name ASC',
      [companyId]
    );
    sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
};

const createCompany = async (req, res, next) => {
  const { name } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO product_companies (name) VALUES ($1) RETURNING *',
      [name]
    );
    sendSuccess(res, result.rows[0], null, 201);
  } catch (error) {
    next(error);
  }
};

const createSubCompany = async (req, res, next) => {
  const { companyId } = req.params;
  const { name } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO product_sub_companies (company_id, name) VALUES ($1, $2) RETURNING *',
      [companyId, name]
    );
    sendSuccess(res, result.rows[0], null, 201);
  } catch (error) {
    next(error);
  }
};

const updateCompany = async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const result = await db.query(
      'UPDATE product_companies SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const deleteCompany = async (req, res, next) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM product_companies WHERE id = $1', [id]);
    sendSuccess(res, null, 'Company deleted');
  } catch (error) {
    next(error);
  }
};

const updateSubCompany = async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;
  try {
    const result = await db.query(
      'UPDATE product_sub_companies SET name = $1 WHERE id = $2 RETURNING *',
      [name, id]
    );
    sendSuccess(res, result.rows[0]);
  } catch (error) {
    next(error);
  }
};

const deleteSubCompany = async (req, res, next) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM product_sub_companies WHERE id = $1', [id]);
    sendSuccess(res, null, 'Sub-company deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCompanies,
  getSubCompanies,
  createCompany,
  createSubCompany,
  updateCompany,
  deleteCompany,
  updateSubCompany,
  deleteSubCompany
};
