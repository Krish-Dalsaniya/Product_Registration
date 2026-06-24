const express = require('express');
const router = express.Router();
const closureController = require('./closureController');
const { validateClosure } = require('./closureValidation');
const { verifyToken } = require('../../../middleware/auth'); 

// We apply authentication middleware to all routes. 
// You can also add role-based checking here if needed.
router.use(verifyToken);

router.get('/metrics', closureController.getMetrics);
router.get('/', closureController.getAllClosures);
router.get('/:id', closureController.getClosureById);
router.post('/', validateClosure, closureController.createClosure);
router.put('/:id', validateClosure, closureController.updateClosure);
router.delete('/:id', closureController.deleteClosure);

module.exports = router;
