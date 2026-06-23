const express = require('express');
const router = express.Router();
const productController = require('./productController');
const { verifyToken } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const upload = require('../../middleware/upload');
const cache = require('../../middleware/cache');
const clearCache = require('../../middleware/clearCache');

// All product routes are protected
router.get('/bom-options', verifyToken, requirePermission('products.view'), cache(300), productController.getBomOptions);
router.get('/', verifyToken, requirePermission('products.view'), cache(60), productController.getProducts);
router.get('/:id', verifyToken, requirePermission('products.view'), productController.getProductById);
router.get('/:id/bom', verifyToken, requirePermission('products.view'), productController.getProductBom);
router.put('/:id/bom', verifyToken, requirePermission('products.edit'), clearCache('/api/products'), productController.saveProductBom);
router.post('/', 
  verifyToken, 
  requirePermission('products.create'), 
  upload.fields([
    { name: 'image', maxCount: 10 },
    { name: 'document', maxCount: 10 }
  ]),
  clearCache('/api/products'),
  productController.createProduct
);
router.put('/:id', 
  verifyToken, 
  requirePermission('products.edit'), 
  upload.fields([
    { name: 'image', maxCount: 10 },
    { name: 'document', maxCount: 10 }
  ]),
  clearCache('/api/products'),
  productController.updateProduct
);
router.delete('/:id/assets', verifyToken, requirePermission('products.edit'), clearCache('/api/products'), productController.removeAsset);
router.delete('/:id', verifyToken, requirePermission('products.delete'), clearCache('/api/products'), productController.deleteProduct);

module.exports = router;

