const express = require('express');
const router = express.Router();
const traineeController = require('../controllers/traineeController');
const { verifyToken } = require('../../../../middleware/auth');
const { requireRole } = require('../../../../middleware/rbac');

// Protect all routes
router.use(verifyToken);

// Dashboard
router.get('/dashboard', traineeController.getDashboardStats);

// Trainee Management (Admins & HR primarily, Managers can view)
router.get('/', traineeController.getTrainees);
router.get('/:id', traineeController.getTraineeById);
router.post('/', requireRole('Admin', 'HR'), traineeController.createTrainee);
router.put('/:id', requireRole('Admin', 'HR'), traineeController.updateTrainee);
router.delete('/:id', requireRole('Admin', 'HR'), traineeController.deleteTrainee);

// Conversion & LMS
router.post('/:id/convert', requireRole('Admin', 'HR'), traineeController.convertToEmployee);
router.post('/:id/assign-training', requireRole('Admin', 'HR'), traineeController.assignTrainingToTrainee);

module.exports = router;
