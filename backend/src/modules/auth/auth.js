const express = require('express');
const { body } = require('express-validator');
const authController = require('./authController');

const router = express.Router();

const upload = require('../../middleware/upload');
const { verifyToken } = require('../../middleware/auth');

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Enter a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  authController.login
);

router.post('/refresh', authController.refresh);

router.post('/logout', authController.logout);

router.post('/profile/image', verifyToken, upload.single('image'), authController.updateProfileImage);
router.delete('/profile/image', verifyToken, authController.removeProfileImage);
router.put(
  '/profile',
  verifyToken,
  [
    body('full_name').notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Enter a valid email')
  ],
  authController.updateProfile
);
router.put(
  '/change-password',
  verifyToken,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').notEmpty().withMessage('New password is required')
  ],
  authController.changePassword
);
router.get('/me', verifyToken, authController.getMe);

router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Enter a valid email')
  ],
  authController.forgotPassword
);

router.post(
  '/verify-email',
  [
    body('token').notEmpty().withMessage('Token is required')
  ],
  authController.verifyEmail
);

router.post(
  '/reset-password',
  [
    body('resetToken').notEmpty().withMessage('Reset token is required'),
    body('newPassword').notEmpty().withMessage('Password is required')
  ],
  authController.resetPassword
);

router.post('/2fa/setup', verifyToken, authController.setup2FA);
router.post('/2fa/verify', verifyToken, authController.verify2FA);
router.post('/2fa/disable', verifyToken, authController.disable2FA);
router.post('/login/2fa', authController.login2FA);
router.post('/setup-password', authController.setupPassword);

module.exports = router;
