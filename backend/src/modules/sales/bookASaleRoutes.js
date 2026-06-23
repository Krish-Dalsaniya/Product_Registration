const express = require('express');
const router = express.Router();
const bookASaleController = require('./bookASaleController');
const { verifyToken } = require('../../middleware/auth');

router.use(verifyToken);

router.get('/options', bookASaleController.getSaleOptions);
router.get('/', bookASaleController.getSales);
router.post('/', bookASaleController.createSale);
router.put('/:id', bookASaleController.updateSale);
router.delete('/:id', bookASaleController.deleteSale);

module.exports = router;
