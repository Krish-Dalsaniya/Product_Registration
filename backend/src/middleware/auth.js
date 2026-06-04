const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { sendError } = require('../utils/response');

const verifyToken = async (req, res, next) => {
  let token = req.cookies?.accessToken;
  
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }
  
  if (!token) {
    return sendError(res, 'UNAUTHORIZED', 'No token provided', 401);
  }
  
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'UNAUTHORIZED', 'Token expired', 401);
    }
    return sendError(res, 'UNAUTHORIZED', 'Invalid token', 401);
  }
};

const isAdmin = (req, res, next) => {
  if (req.user && req.user.role_name === 'Admin') {
    next();
  } else {
    return sendError(res, 'FORBIDDEN', 'Access denied. Admin role required.', 403);
  }
};

module.exports = { verifyToken, isAdmin };
