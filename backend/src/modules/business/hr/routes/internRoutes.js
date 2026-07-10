const express = require('express');
const router = express.Router();
const internController = require('../controllers/internController');
const { verifyToken } = require('../../../../middleware/auth');
const { requireRole } = require('../../../../middleware/rbac');

// Protect all routes
router.use(verifyToken);

// Dashboard
router.get('/dashboard', internController.getDashboardStats);

// Intern Management (Admins & HR primarily, Managers can view)
router.get('/', internController.getInterns);
router.get('/:id', internController.getInternById);
router.post('/', requireRole('Admin', 'HR'), internController.createIntern);
router.put('/:id', requireRole('Admin', 'HR'), internController.updateIntern);
router.delete('/:id', requireRole('Admin', 'HR'), internController.deleteIntern);

// Conversion & LMS
router.post('/:id/convert', requireRole('Admin', 'HR'), internController.convertToEmployee);
router.post('/:id/convert-to-trainee', requireRole('Admin', 'HR'), internController.convertToTrainee);
router.post('/:id/assign-training', requireRole('Admin', 'HR'), internController.assignTrainingToIntern);

module.exports = router;
