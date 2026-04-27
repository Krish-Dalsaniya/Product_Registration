const express = require('express');
const maintenanceController = require('../controllers/maintenanceController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(verifyToken);
router.use(requireRole('Maintenance'));

router.get('/profile', maintenanceController.getProfile);
router.put('/profile', maintenanceController.updateProfile);
router.get('/tasks', maintenanceController.getTasks);
router.get('/tasks/:taskId', maintenanceController.getTaskById);
router.put('/tasks/:taskId', maintenanceController.updateTaskStatus);

module.exports = router;
