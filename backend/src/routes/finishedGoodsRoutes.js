const express = require('express');
const router = express.Router();
const finishedGoodsController = require('../controllers/finishedGoodsController');
const cache = require('../middleware/cache');
const clearCache = require('../middleware/clearCache');

router.get('/', cache(60), finishedGoodsController.getFinishedGoods);
router.post('/', clearCache('/api/finished-goods'), finishedGoodsController.createFinishedGood);
router.put('/:id', clearCache('/api/finished-goods'), finishedGoodsController.updateFinishedGood);
router.post('/:id/add-stock', clearCache('/api/finished-goods'), finishedGoodsController.addFinishedGoodStock);
router.get('/options', cache(60), finishedGoodsController.getComponentOptions);
router.delete('/:id', clearCache('/api/finished-goods'), finishedGoodsController.deleteFinishedGood);

module.exports = router;
