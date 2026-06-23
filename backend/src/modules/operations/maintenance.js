const express = require('express');
const maintenanceController = require('./maintenanceController');
const { verifyToken } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');

const router = express.Router();

router.use(verifyToken);
router.use(requirePermission('products.view'));

router.get('/profile', maintenanceController.getProfile);
router.put('/profile', maintenanceController.updateProfile);
router.get('/tasks', maintenanceController.getTasks);
router.get('/tasks/:taskId', maintenanceController.getTaskById);
router.put('/tasks/:taskId', requirePermission('products.edit'), maintenanceController.updateTaskStatus);

module.exports = router;
