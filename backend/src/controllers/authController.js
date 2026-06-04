const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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

    const sha256Token = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const hashedRefreshToken = await bcrypt.hash(sha256Token, 10);
    await db.query('UPDATE users SET refresh_token = $1 WHERE user_id = $2', [hashedRefreshToken, user.user_id]);

    // Secure cookies dynamically based on connection protocol
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const useSecureCookies = isHttps && (env.NODE_ENV === 'production' || (env.FRONTEND_URL ? env.FRONTEND_URL.startsWith('https://') : false));

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: useSecureCookies ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: useSecureCookies ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    sendSuccess(res, {
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
  // Use cookies to get refresh token
  const refreshToken = req.cookies?.refreshToken;

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

    if (!user || !user.refresh_token) {
      return sendError(res, 'UNAUTHORIZED', 'User not found, inactive, or logged out', 401);
    }

    const sha256Token = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const isMatch = await bcrypt.compare(sha256Token, user.refresh_token);
    if (!isMatch) {
      // Possible token reuse / stolen token
      return sendError(res, 'UNAUTHORIZED', 'Invalid refresh token', 401);
    }

    const accessToken = jwt.sign(
      { user_id: user.user_id, role_name: user.role_name },
      env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Secure cookies dynamically based on connection protocol
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const useSecureCookies = isHttps && (env.NODE_ENV === 'production' || (env.FRONTEND_URL ? env.FRONTEND_URL.startsWith('https://') : false));

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: useSecureCookies ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    sendSuccess(res, { message: 'Token refreshed successfully' });
  } catch (error) {
    return sendError(res, 'UNAUTHORIZED', 'Invalid refresh token', 401);
  }
};


const logout = async (req, res) => {
  // Clear cookies
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const useSecureCookies = isHttps && (env.NODE_ENV === 'production' || (env.FRONTEND_URL ? env.FRONTEND_URL.startsWith('https://') : false));
  const cookieOptions = {
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: useSecureCookies ? 'none' : 'lax',
  };

  const refreshToken = req.cookies?.refreshToken;
  
  if (refreshToken) {
    try {
        const decoded = jwt.decode(refreshToken);
        if (decoded && decoded.user_id) {
            // Revoke refresh token in database
            await db.query('UPDATE users SET refresh_token = NULL WHERE user_id = $1', [decoded.user_id]);
        }
    } catch (err) {
        console.error('Error invalidating refresh token in database:', err);
    }
  }

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);

  sendSuccess(res, { message: 'Logged out' });
};
module.exports = {
  login,
  refresh,
  logout
};
