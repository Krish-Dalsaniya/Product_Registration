const express = require('express');
const router = express.Router();
const categoryController = require('./categoryController');
const { verifyToken } = require('../../middleware/auth');
const cache = require('../../middleware/cache');
const clearCache = require('../../middleware/clearCache');

router.use(verifyToken);

router.get('/', cache(60), categoryController.getCategories);
router.post('/', clearCache('/api/categories'), categoryController.createCategory);
router.put('/:id', clearCache('/api/categories'), categoryController.updateCategory);
router.delete('/:id', clearCache('/api/categories'), categoryController.deleteCategory);

router.get('/:categoryId/sub', cache(60), categoryController.getSubCategories);
router.post('/:categoryId/sub', clearCache('/api/categories'), categoryController.createSubCategory);
router.put('/sub/:id', clearCache('/api/categories'), categoryController.updateSubCategory);
router.delete('/sub/:id', clearCache('/api/categories'), categoryController.deleteSubCategory);

module.exports = router;
