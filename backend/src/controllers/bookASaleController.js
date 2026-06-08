const db = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');
const { parsePagination } = require('../utils/pagination');

/**
 * GET /api/book-a-sale/options
 * Returns finished goods (with available qty) and customers for dropdowns.
 */
const getSaleOptions = async (req, res, next) => {
  try {
    // Fetch finished goods with product name and available quantity
    const finishedGoods = await db.query(`
      SELECT 
        fg.id,
        fg.quantity,
        fg.version,
        p.product_name,
        p.product_code,
        fg.is_iot
      FROM finished_goods fg
      JOIN products p ON fg.product_id = p.product_id
      WHERE fg.quantity > 0
      ORDER BY p.product_name ASC
    `);

    // Fetch customers
    const customers = await db.query(`
      SELECT 
        customer_id::text AS customer_id,
        customer_name,
        company_name,
        customer_code,
        email
      FROM customers
      WHERE status = 'Active'
      ORDER BY customer_name ASC
    `);

    sendSuccess(res, {
      finishedGoods: finishedGoods.rows,
      customers: customers.rows,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/book-a-sale
 * List all booked sales with pagination.
 */
const getSales = async (req, res, next) => {
  const { page, limit, offset } = parsePagination(req);
  const { search } = req.query;

  try {
    let queryText = `
      SELECT 
        bs.*,
        p.product_name,
        p.product_code,
        fg.version,
        c.customer_name,
        c.company_name,
        c.customer_code,
        COUNT(*) OVER() AS total_count
      FROM book_a_sale bs
      JOIN finished_goods fg ON fg.id = bs.finished_good_id
      JOIN products p ON p.product_id = fg.product_id
      JOIN customers c ON c.customer_id = bs.customer_id
      WHERE 1=1
    `;
    const params = [limit, offset];

    if (search) {
      queryText += ` AND (p.product_name ILIKE $3 OR c.customer_name ILIKE $3 OR c.company_name ILIKE $3 OR p.product_code ILIKE $3)`;
      params.push(`%${search}%`);
    }

    queryText += ` ORDER BY bs.created_at DESC LIMIT $1 OFFSET $2`;

    const result = await db.query(queryText, params);
    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;

    sendSuccess(res, result.rows, { page, limit, total });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/book-a-sale
 * Book a sale: validates finished goods quantity and reduces it.
 */
const createSale = async (req, res, next) => {
  const { finished_good_id, customer_id, quantity } = req.body;

  if (!finished_good_id || !customer_id || !quantity) {
    return sendError(res, 'VALIDATION_ERROR', 'finished_good_id, customer_id and quantity are required.', 400);
  }

  const requestedQty = parseInt(quantity, 10);
  if (isNaN(requestedQty) || requestedQty < 1) {
    return sendError(res, 'VALIDATION_ERROR', 'Quantity must be a positive integer.', 400);
  }

  try {
    const sale = await db.withTransaction(async (client) => {
        // Lock the finished good row for update
        const fgResult = await client.query(
          'SELECT fg.id, fg.quantity, p.product_name FROM finished_goods fg JOIN products p ON p.product_id = fg.product_id WHERE fg.id = $1 FOR UPDATE',
          [finished_good_id]
        );

        if (fgResult.rows.length === 0) {
          throw new Error('NOT_FOUND_FG');
        }

        const fg = fgResult.rows[0];
        const availableQty = parseInt(fg.quantity, 10);

        if (availableQty < requestedQty) {
          throw new Error(`INSUFFICIENT_QUANTITY|${availableQty}|${fg.product_name}`);
        }

        // Validate customer exists
        const custResult = await client.query('SELECT customer_id FROM customers WHERE customer_id = $1::uuid', [customer_id]);
        if (custResult.rows.length === 0) {
          throw new Error('NOT_FOUND_CUSTOMER');
        }

        // Deduct quantity from finished_goods
        await client.query(
          'UPDATE finished_goods SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2',
          [requestedQty, finished_good_id]
        );

        // Create the sale record
        const saleResult = await client.query(
          `INSERT INTO book_a_sale (finished_good_id, customer_id, quantity, sale_date)
           VALUES ($1, $2::uuid, $3, NOW()) RETURNING *`,
          [finished_good_id, customer_id, requestedQty]
        );

        return saleResult.rows[0];
    });

    sendSuccess(res, sale, 'Sale booked successfully', 201);
  } catch (error) {
    if (error.message === 'NOT_FOUND_FG') {
      return sendError(res, 'NOT_FOUND', 'Finished good not found.', 404);
    }
    if (error.message.startsWith('INSUFFICIENT_QUANTITY')) {
      const parts = error.message.split('|');
      return sendError(res, 'INSUFFICIENT_QUANTITY', `Not sufficient quantity. Required ${requestedQty}, but only ${parts[1]} available for "${parts[2]}".`, 400);
    }
    if (error.message === 'NOT_FOUND_CUSTOMER') {
      return sendError(res, 'NOT_FOUND', 'Customer not found.', 404);
    }
    next(error);
  }
};

/**
 * DELETE /api/book-a-sale/:id
 * Cancel/delete a sale and restore the quantity to finished goods.
 */
const deleteSale = async (req, res, next) => {
  const { id } = req.params;

  try {
    await db.withTransaction(async (client) => {
        const saleResult = await client.query('SELECT * FROM book_a_sale WHERE id = $1', [id]);
        if (saleResult.rows.length === 0) {
          throw new Error('NOT_FOUND');
        }

        const sale = saleResult.rows[0];

        // Restore quantity back to finished goods
        await client.query(
          'UPDATE finished_goods SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2',
          [sale.quantity, sale.finished_good_id]
        );

        // Delete the sale
        await client.query('DELETE FROM book_a_sale WHERE id = $1', [id]);
    });

    sendSuccess(res, { id }, 'Sale deleted and quantity restored successfully');
  } catch (error) {
    if (error.message === 'NOT_FOUND') {
        return sendError(res, 'NOT_FOUND', 'Sale record not found.', 404);
    }
    next(error);
  }
};

/**
 * PUT /api/book-a-sale/:id
 * Update a sale: validates finished goods quantity and adjusts it.
 */
const updateSale = async (req, res, next) => {
  const { id } = req.params;
  const { finished_good_id, customer_id, quantity } = req.body;

  if (!finished_good_id || !customer_id || !quantity) {
    return sendError(res, 'VALIDATION_ERROR', 'finished_good_id, customer_id and quantity are required.', 400);
  }

  const requestedQty = parseInt(quantity, 10);
  if (isNaN(requestedQty) || requestedQty < 1) {
    return sendError(res, 'VALIDATION_ERROR', 'Quantity must be a positive integer.', 400);
  }

  try {
    const updateResult = await db.withTransaction(async (client) => {
        // Lock the sale record
        const saleResult = await client.query('SELECT * FROM book_a_sale WHERE id = $1 FOR UPDATE', [id]);
        if (saleResult.rows.length === 0) {
          throw new Error('NOT_FOUND_SALE');
        }
        const sale = saleResult.rows[0];

        const oldFinishedGoodId = sale.finished_good_id;
        const oldQty = sale.quantity;

        // Restore old quantity
        await client.query('UPDATE finished_goods SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2', [oldQty, oldFinishedGoodId]);

        // Check new quantity requirements
        const fgResult = await client.query(
          'SELECT fg.id, fg.quantity, p.product_name FROM finished_goods fg JOIN products p ON p.product_id = fg.product_id WHERE fg.id = $1 FOR UPDATE',
          [finished_good_id]
        );

        if (fgResult.rows.length === 0) {
          throw new Error('NOT_FOUND_FG');
        }

        const fg = fgResult.rows[0];
        const availableQty = parseInt(fg.quantity, 10);

        if (availableQty < requestedQty) {
          throw new Error(`INSUFFICIENT_QUANTITY|${availableQty}|${fg.product_name}`);
        }

        // Validate customer exists
        const custResult = await client.query('SELECT customer_id FROM customers WHERE customer_id = $1::uuid', [customer_id]);
        if (custResult.rows.length === 0) {
          throw new Error('NOT_FOUND_CUSTOMER');
        }

        // Deduct new quantity
        await client.query('UPDATE finished_goods SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2', [requestedQty, finished_good_id]);

        // Update sale record
        const updated = await client.query(
          `UPDATE book_a_sale SET finished_good_id = $1, customer_id = $2::uuid, quantity = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
          [finished_good_id, customer_id, requestedQty, id]
        );
        return updated.rows[0];
    });

    sendSuccess(res, updateResult, 'Sale updated successfully');
  } catch (error) {
    if (error.message === 'NOT_FOUND_SALE') {
        return sendError(res, 'NOT_FOUND', 'Sale record not found.', 404);
    }
    if (error.message === 'NOT_FOUND_FG') {
        return sendError(res, 'NOT_FOUND', 'Finished good not found.', 404);
    }
    if (error.message.startsWith('INSUFFICIENT_QUANTITY')) {
      const parts = error.message.split('|');
      return sendError(res, 'INSUFFICIENT_QUANTITY', `Not sufficient quantity. Required ${requestedQty}, but only ${parts[1]} available for "${parts[2]}".`, 400);
    }
    if (error.message === 'NOT_FOUND_CUSTOMER') {
      return sendError(res, 'NOT_FOUND', 'Customer not found.', 404);
    }
    next(error);
  }
};

module.exports = {
  getSaleOptions,
  getSales,
  createSale,
  deleteSale,
  updateSale,
};
