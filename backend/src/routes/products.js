const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// All product routes are protected and for Admin
router.use(verifyToken);
router.use(requireRole('Admin'));

router.get('/', productController.getProducts);
router.post('/', productController.createProduct);

module.exports = router;
