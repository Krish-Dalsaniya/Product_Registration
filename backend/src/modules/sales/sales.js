const express = require('express');
const salesController = require('./salesController');
const { verifyToken } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');

const router = express.Router();

router.use(verifyToken);
router.use(requirePermission('sales.view'));

router.get('/profile', salesController.getProfile);
router.put('/profile', requirePermission('sales.edit'), salesController.updateProfile);
router.get('/products', salesController.getProducts);
router.get('/opportunities', salesController.getOpportunities);
router.post('/opportunities', requirePermission('sales.create'), salesController.createOpportunity);
router.put('/opportunities/:id', requirePermission('sales.edit'), salesController.updateOpportunity);
router.delete('/opportunities/:id', requirePermission('sales.delete'), salesController.deleteOpportunity);

module.exports = router;
