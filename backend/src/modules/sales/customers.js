const express = require('express');
const customerController = require('./customerController');
const { verifyToken } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');
const cache = require('../../middleware/cache');
const clearCache = require('../../middleware/clearCache');

const router = express.Router();

router.use(verifyToken);
router.use(requirePermission('customers.view')); // Base permission for all customer routes

router.get('/', cache(60), customerController.getCustomers);
router.get('/:id', cache(60), customerController.getCustomerById);
router.post('/', requirePermission('customers.create'), clearCache('/api/customers'), customerController.createCustomer);
router.put('/:id', requirePermission('customers.edit'), clearCache('/api/customers'), customerController.updateCustomer);
router.delete('/:id', requirePermission('customers.delete'), clearCache('/api/customers'), customerController.deleteCustomer);

module.exports = router;
