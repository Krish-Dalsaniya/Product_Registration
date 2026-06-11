const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const db = require('../config/db');
const env = require('../config/env');
const { sendSuccess, sendError } = require('../utils/response');
const cloudinary = require('../config/cloudinary');
const fs = require('fs');
const path = require('path');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'BAD_REQUEST', errors.array()[0].msg, 400);
  }

  const { email, password } = req.body;

  try {
    const result = await db.query(
      `SELECT u.*, r.role_name, COALESCE(uca.has_custom_permissions, false) as has_custom_permissions,
              COALESCE(u2f.is_two_factor_enabled, false) as is_two_factor_enabled
       FROM users u 
       JOIN roles r ON r.role_id = u.role_id 
       LEFT JOIN user_custom_access uca ON u.user_id = uca.user_id
       LEFT JOIN user_two_factor u2f ON u.user_id = u2f.user_id
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

    if (user.is_two_factor_enabled) {
      const tempToken = jwt.sign(
        { user_id: user.user_id, email: user.email },
        env.JWT_SECRET,
        { expiresIn: '5m' }
      );
      return sendSuccess(res, {
        require2FA: true,
        tempToken: tempToken
      });
    } else {
      const secret = speakeasy.generateSecret({
        name: `ProductRegistration (${user.email})`
      });
      
      await db.query(`
        INSERT INTO user_two_factor (user_id, two_factor_secret, is_two_factor_enabled)
        VALUES ($1, $2, false)
        ON CONFLICT (user_id) DO UPDATE SET two_factor_secret = EXCLUDED.two_factor_secret, is_two_factor_enabled = false
      `, [user.user_id, secret.base32]);
      
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
      
      const tempToken = jwt.sign(
        { user_id: user.user_id, email: user.email },
        env.JWT_SECRET,
        { expiresIn: '15m' }
      );
      
      return sendSuccess(res, {
        require2FASetup: true,
        tempToken: tempToken,
        qrCodeUrl: qrCodeUrl,
        secret: secret.base32
      });
    }

    const accessToken = jwt.sign(
      { user_id: user.user_id, role_id: user.role_id, role_name: user.role_name },
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

    let permissions = [];
    if (user.has_custom_permissions) {
      const permsResult = await db.query(`
        SELECT p.permission_key 
        FROM permissions p
        JOIN user_permissions up ON p.permission_id = up.permission_id
        WHERE up.user_id = $1
      `, [user.user_id]);
      permissions = permsResult.rows.map(r => r.permission_key);
    } else {
      const permsResult = await db.query(`
        SELECT p.permission_key 
        FROM permissions p
        JOIN role_permissions rp ON p.permission_id = rp.permission_id
        WHERE rp.role_id = $1
      `, [user.role_id]);
      permissions = permsResult.rows.map(r => r.permission_key);
    }

    sendSuccess(res, {
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role_name: user.role_name,
        image_url: user.image_url,
        permissions: permissions
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
      `SELECT u.*, r.role_name, COALESCE(uca.has_custom_permissions, false) as has_custom_permissions
       FROM users u 
       JOIN roles r ON r.role_id = u.role_id 
       LEFT JOIN user_custom_access uca ON u.user_id = uca.user_id
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
const updateProfileImage = async (req, res, next) => {
  const userId = req.user.user_id; // From verifyToken middleware
  
  if (!req.file) {
    return sendError(res, 'BAD_REQUEST', 'No image file provided', 400);
  }

  try {
    // 1. Fetch current user to get old image URL
    const currentUser = await db.query('SELECT image_url FROM users WHERE user_id = $1', [userId]);
    if (currentUser.rows.length === 0) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return sendError(res, 'NOT_FOUND', 'User not found', 404);
    }
    const oldImageUrl = currentUser.rows[0].image_url;

    // 2. Upload new image to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'users/avatars',
      resource_type: 'image',
    });
    const newImageUrl = result.secure_url;

    // 3. Delete local file
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    // 4. Update database
    await db.query('UPDATE users SET image_url = $1 WHERE user_id = $2', [newImageUrl, userId]);

    // 5. Cleanup old image from Cloudinary if it exists
    if (oldImageUrl && oldImageUrl.includes('cloudinary.com')) {
      try {
        const parts = oldImageUrl.split('/');
        const lastPart = parts[parts.length - 1];
        const folderParts = parts.slice(parts.indexOf('upload') + 2, parts.length - 1);
        const publicIdWithExt = [...folderParts, lastPart].join('/');
        const publicId = publicIdWithExt.split('.')[0];
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
      } catch (e) {
        console.error('Failed to delete old Cloudinary image:', e);
      }
    } else if (oldImageUrl) {
      // Cleanup local old image if any
      const filePath = path.join(__dirname, '../../', oldImageUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    sendSuccess(res, { image_url: newImageUrl }, 'Profile image updated successfully');
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(error);
  }
};

const removeProfileImage = async (req, res, next) => {
  const userId = req.user.user_id;

  try {
    const userResult = await db.query('SELECT image_url FROM users WHERE user_id = $1', [userId]);
    if (userResult.rows.length === 0) return sendError(res, 'NOT_FOUND', 'User not found', 404);
    
    const imageUrl = userResult.rows[0].image_url;
    if (imageUrl) {
      if (imageUrl.includes('cloudinary.com')) {
        try {
          const parts = imageUrl.split('/');
          const lastPart = parts[parts.length - 1];
          const folderParts = parts.slice(parts.indexOf('upload') + 2, parts.length - 1);
          const publicIdWithExt = [...folderParts, lastPart].join('/');
          const publicId = publicIdWithExt.split('.')[0];
          await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        } catch (e) {
          console.error('Failed to delete Cloudinary image:', e);
        }
      } else {
        const filePath = path.join(__dirname, '../../', imageUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      
      await db.query('UPDATE users SET image_url = NULL WHERE user_id = $1', [userId]);
    }
    
    sendSuccess(res, null, 'Image removed successfully');
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT u.*, r.role_name, COALESCE(uca.has_custom_permissions, false) as has_custom_permissions
       FROM users u 
       JOIN roles r ON r.role_id = u.role_id 
       LEFT JOIN user_custom_access uca ON u.user_id = uca.user_id
       WHERE u.user_id = $1 AND u.is_active = true`,
      [req.user.user_id]
    );

    const user = result.rows[0];
    if (!user) {
      return sendError(res, 'UNAUTHORIZED', 'User not found or inactive', 401);
    }

    let permissions = [];
    if (user.has_custom_permissions) {
      const permsResult = await db.query(`
        SELECT p.permission_key 
        FROM permissions p
        JOIN user_permissions up ON p.permission_id = up.permission_id
        WHERE up.user_id = $1
      `, [user.user_id]);
      permissions = permsResult.rows.map(r => r.permission_key);
    } else {
      const permsResult = await db.query(`
        SELECT p.permission_key 
        FROM permissions p
        JOIN role_permissions rp ON p.permission_id = rp.permission_id
        WHERE rp.role_id = $1
      `, [user.role_id]);
      permissions = permsResult.rows.map(r => r.permission_key);
    }

    sendSuccess(res, {
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role_name: user.role_name,
        image_url: user.image_url,
        permissions: permissions
      }
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'BAD_REQUEST', errors.array()[0].msg, 400);
  }

  const { email, newPassword } = req.body;

  try {
    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    const result = await db.query(
      'UPDATE users SET password_hash = $1 WHERE LOWER(email) = LOWER($2) AND is_active = true RETURNING user_id',
      [passwordHash, email]
    );

    if (result.rowCount === 0) {
      return sendError(res, 'BAD_REQUEST', 'Failed to reset password. User not found.', 400);
    }

    sendSuccess(res, null, 'Password successfully reset.');
  } catch (error) {
    next(error);
  }
};

const setup2FA = async (req, res, next) => {
  try {
    const userRes = await db.query('SELECT email FROM users WHERE user_id = $1', [req.user.user_id]);
    const email = userRes.rows[0]?.email || 'User';

    const secret = speakeasy.generateSecret({
      name: email,
      issuer: 'Product Registration'
    });
    
    await db.query(`
      INSERT INTO user_two_factor (user_id, two_factor_secret, is_two_factor_enabled)
      VALUES ($1, $2, false)
      ON CONFLICT (user_id) DO UPDATE SET two_factor_secret = EXCLUDED.two_factor_secret, is_two_factor_enabled = false
    `, [req.user.user_id, secret.base32]);

    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
      if (err) throw err;
      sendSuccess(res, { qrCodeUrl: data_url, secret: secret.base32 });
    });
  } catch (error) {
    next(error);
  }
};

const verify2FA = async (req, res, next) => {
  const { otp } = req.body;
  if (!otp) return sendError(res, 'BAD_REQUEST', 'OTP is required', 400);

  try {
    const result = await db.query('SELECT two_factor_secret FROM user_two_factor WHERE user_id = $1', [req.user.user_id]);
    if (result.rowCount === 0) return sendError(res, 'BAD_REQUEST', '2FA not set up', 400);

    const secret = result.rows[0].two_factor_secret;
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: otp
    });

    if (verified) {
      await db.query('UPDATE user_two_factor SET is_two_factor_enabled = true WHERE user_id = $1', [req.user.user_id]);
      sendSuccess(res, null, '2FA successfully enabled');
    } else {
      sendError(res, 'BAD_REQUEST', 'Invalid OTP', 400);
    }
  } catch (error) {
    next(error);
  }
};

const disable2FA = async (req, res, next) => {
  try {
    await db.query('UPDATE user_two_factor SET is_two_factor_enabled = false WHERE user_id = $1', [req.user.user_id]);
    sendSuccess(res, null, '2FA successfully disabled');
  } catch (error) {
    next(error);
  }
};

const login2FA = async (req, res, next) => {
  const { tempToken, otp } = req.body;
  if (!tempToken || !otp) return sendError(res, 'BAD_REQUEST', 'Missing token or OTP', 400);

  try {
    const decoded = jwt.verify(tempToken, env.JWT_SECRET);
    const result = await db.query(
      `SELECT u.*, r.role_name, COALESCE(u2f.two_factor_secret, '') as two_factor_secret, COALESCE(u2f.is_two_factor_enabled, false) as is_two_factor_enabled
       FROM users u 
       JOIN roles r ON r.role_id = u.role_id 
       JOIN user_two_factor u2f ON u.user_id = u2f.user_id
       WHERE u.user_id = $1 AND u.is_active = true`,
      [decoded.user_id]
    );

    const user = result.rows[0];
    if (!user) return sendError(res, 'UNAUTHORIZED', 'Invalid session', 401);

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: otp
    });

    if (!verified) {
      return sendError(res, 'UNAUTHORIZED', 'Invalid 2FA code', 401);
    }

    if (!user.is_two_factor_enabled) {
      await db.query('UPDATE user_two_factor SET is_two_factor_enabled = true WHERE user_id = $1', [user.user_id]);
    }

    const accessToken = jwt.sign(
      { user_id: user.user_id, role_id: user.role_id, role_name: user.role_name },
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

    let permissions = [];
    const customPermsResult = await db.query('SELECT has_custom_permissions FROM user_custom_access WHERE user_id = $1', [user.user_id]);
    const hasCustom = customPermsResult.rows.length > 0 ? customPermsResult.rows[0].has_custom_permissions : false;
    
    if (hasCustom) {
      const permsResult = await db.query(`
        SELECT p.permission_key 
        FROM permissions p
        JOIN user_permissions up ON p.permission_id = up.permission_id
        WHERE up.user_id = $1
      `, [user.user_id]);
      permissions = permsResult.rows.map(r => r.permission_key);
    } else {
      const permsResult = await db.query(`
        SELECT p.permission_key 
        FROM permissions p
        JOIN role_permissions rp ON p.permission_id = rp.permission_id
        WHERE rp.role_id = $1
      `, [user.role_id]);
      permissions = permsResult.rows.map(r => r.permission_key);
    }

    sendSuccess(res, {
      user: {
        user_id: user.user_id,
        full_name: user.full_name,
        email: user.email,
        role_name: user.role_name,
        image_url: user.image_url,
        permissions: permissions
      }
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') return sendError(res, 'UNAUTHORIZED', 'Session expired, please login again', 401);
    next(error);
  }
};

module.exports = {
  login,
  refresh,
  logout,
  updateProfileImage,
  removeProfileImage,
  resetPassword,
  getMe,
  setup2FA,
  verify2FA,
  disable2FA,
  login2FA
};
