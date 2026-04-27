const { sendError } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error(err);

  // express-validator errors are usually handled in the controller
  // but if they leak here:
  if (err.errors && Array.isArray(err.errors)) {
    return sendError(res, 'BAD_REQUEST', err.errors[0].msg, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return sendError(res, 'UNAUTHORIZED', err.message, 401);
  }

  // PostgreSQL errors
  if (err.code === '23505') {
    return sendError(res, 'CONFLICT', 'Duplicate record already exists', 409);
  }
  if (err.code === '23503') {
    return sendError(res, 'BAD_REQUEST', 'Referenced record not found', 400);
  }

  // Default error
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  sendError(res, code, message, status);
};

module.exports = errorHandler;
