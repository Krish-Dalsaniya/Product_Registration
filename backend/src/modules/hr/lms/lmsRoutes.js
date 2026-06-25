const express = require('express');
const router = express.Router();
const lmsController = require('./lmsController');
const { verifyToken } = require('../../../middleware/auth');

// Protect all routes
router.use(verifyToken);

// --- Dashboard Stats ---
router.get('/stats', lmsController.getDashboardStats);

// --- Training Modules ---
router.post('/module', lmsController.createModule);
router.get('/modules', lmsController.getAllModules);
router.put('/module/:id', lmsController.updateModule);
router.delete('/module/:id', lmsController.deleteModule);

// --- Employee Training Assignments ---
router.post('/assignment', lmsController.assignTraining);
router.get('/assignments', lmsController.getAllAssignments);
router.patch('/assignment/:id/status', lmsController.updateAssignmentStatus);

module.exports = router;
