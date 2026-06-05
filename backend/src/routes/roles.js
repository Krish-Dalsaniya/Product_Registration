const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { verifyToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// Use auth for all routes
router.use(verifyToken);

// All roles endpoints require the roles.view / roles.edit permission
// Admin bypasses these checks
router.get('/', requirePermission('roles.view'), roleController.getAllRoles);
router.post('/', requirePermission('roles.create'), roleController.createRole);
router.put('/:id', requirePermission('roles.edit'), roleController.updateRole);
router.delete('/:id', requirePermission('roles.delete'), roleController.deleteRole);
router.get('/permissions', requirePermission('roles.view'), roleController.getAllPermissions);

module.exports = router;
