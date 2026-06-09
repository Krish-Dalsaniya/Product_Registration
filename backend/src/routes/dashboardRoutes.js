const express = require('express');
const { getSalesDashboardStats, getMaintenanceDashboardStats, getDesignerDashboardStats, getLowStockAlerts } = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const router = express.Router();

router.use(verifyToken);

router.get('/sales', requirePermission('sales.view'), getSalesDashboardStats);
router.get('/maintenance', requirePermission('supporttickets.view'), getMaintenanceDashboardStats);
router.get('/designer', requirePermission('products.view'), getDesignerDashboardStats);
router.get('/low-stock-alerts', requirePermission('inventory.view'), getLowStockAlerts);

module.exports = router;
