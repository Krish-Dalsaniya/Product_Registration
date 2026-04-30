const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', categoryController.getCategories);
router.post('/', categoryController.createCategory);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

router.get('/:categoryId/sub', categoryController.getSubCategories);
router.post('/:categoryId/sub', categoryController.createSubCategory);
router.put('/sub/:id', categoryController.updateSubCategory);
router.delete('/sub/:id', categoryController.deleteSubCategory);

module.exports = router;
