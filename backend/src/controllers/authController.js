const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db = require('../config/db');
const env = require('../config/env');
const { sendSuccess, sendError } = require('../utils/response');

const login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'BAD_REQUEST', errors.array()[0].msg, 400);
  }

  const { email, password } = req.body;

  try {
    const result = await db.query(
      `SELECT u.*, r.role_name 
       FROM users u 
       JOIN roles r ON r.role_id = u.role_id 
       WHERE LOWER(u.email) = LOWER($1) AND u.is_active = true`,
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      console.log(`[Login] User not found for email: ${email}`);
      return sendError(res, 'UNAUTHORIZED', 'Invalid email or password', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      console.log(`[Login] Invalid password for user: ${email}`);
      return sendError(res, 'UNAUTHORIZED', 'Invalid email or password', 401);
    }

    const accessToken = jwt.sign(
      { user_id: user.user_id, role_name: user.role_name },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { user_id: user.user_id },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    sendSuccess(res, {
      accessToken,
      refreshToken,
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role_name: user.role_name
      }
    });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return sendError(res, 'BAD_REQUEST', 'Refresh token is required', 400);
  }

  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    
    const result = await db.query(
      `SELECT u.*, r.role_name 
       FROM users u 
       JOIN roles r ON r.role_id = u.role_id 
       WHERE u.user_id = $1 AND u.is_active = true`,
      [decoded.user_id]
    );

    const user = result.rows[0];

    if (!user) {
      return sendError(res, 'UNAUTHORIZED', 'User not found or inactive', 401);
    }

    const accessToken = jwt.sign(
      { user_id: user.user_id, role_name: user.role_name },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    sendSuccess(res, { accessToken });
  } catch (error) {
    return sendError(res, 'UNAUTHORIZED', 'Invalid refresh token', 401);
  }
};

const logout = (req, res) => {
  sendSuccess(res, { message: 'Logged out' });
};

module.exports = {
  login,
  refresh,
  logout
};
