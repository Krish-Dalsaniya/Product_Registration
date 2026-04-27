const express = require('express');
const salesController = require('../controllers/salesController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(verifyToken);
router.use(requireRole('Sales'));

router.get('/profile', salesController.getProfile);
router.put('/profile', salesController.updateProfile);
router.get('/products', salesController.getProducts);
router.get('/opportunities', salesController.getOpportunities);
router.post('/opportunities', salesController.createOpportunity);
router.put('/opportunities/:id', salesController.updateOpportunity);
router.delete('/opportunities/:id', salesController.deleteOpportunity);

module.exports = router;
