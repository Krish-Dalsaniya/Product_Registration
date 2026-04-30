const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

router.get('/', categoryController.getCategories);
router.post('/', categoryController.createCategory);
router.get('/:categoryId/sub', categoryController.getSubCategories);
router.post('/:categoryId/sub', categoryController.createSubCategory);

module.exports = router;
