const express = require('express');
const { getSalesDashboardStats, getMaintenanceDashboardStats, getDesignerDashboardStats } = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const router = express.Router();

router.use(verifyToken);

router.get('/sales', requirePermission('dashboard.view'), getSalesDashboardStats);
router.get('/maintenance', requirePermission('dashboard.view'), getMaintenanceDashboardStats);
router.get('/designer', requirePermission('dashboard.view'), getDesignerDashboardStats);

module.exports = router;
