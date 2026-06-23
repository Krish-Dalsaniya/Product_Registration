const express = require('express');
const router = express.Router();
const auditController = require('./auditController');
const { verifyToken } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/rbac');

// Only Admins should be able to view audit logs
router.get('/', verifyToken, requireRole('Admin'), auditController.getAuditLogs);

module.exports = router;
