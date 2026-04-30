const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const upload = require('../middleware/upload');

// All product routes are protected and for Admin
router.get('/', verifyToken, requireRole('Admin', 'Staff'), productController.getProducts);
router.post('/', 
  verifyToken, 
  requireRole('Admin'), 
  upload.fields([
    { name: 'image', maxCount: 10 },
    { name: 'document', maxCount: 10 }
  ]),
  productController.createProduct
);
router.put('/:id', 
  verifyToken, 
  requireRole('Admin'), 
  upload.fields([
    { name: 'image', maxCount: 10 },
    { name: 'document', maxCount: 10 }
  ]),
  productController.updateProduct
);
router.delete('/:id/assets', verifyToken, requireRole('Admin'), productController.removeAsset);

module.exports = router;
