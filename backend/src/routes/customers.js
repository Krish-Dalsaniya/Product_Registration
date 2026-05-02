const express = require('express');
const customerController = require('../controllers/customerController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(verifyToken);

router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomerById);
router.post('/', requireRole('Admin'), customerController.createCustomer);
router.put('/:id', requireRole('Admin'), customerController.updateCustomer);
router.delete('/:id', requireRole('Admin'), customerController.deleteCustomer);

module.exports = router;
