const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');

const router = express.Router();

const upload = require('../middleware/upload');
const { verifyToken } = require('../middleware/auth');

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

module.exports = router;
