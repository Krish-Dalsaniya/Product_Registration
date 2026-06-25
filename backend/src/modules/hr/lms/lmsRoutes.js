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
router.get('/youtube-title/:videoId', lmsController.getYoutubeTitle);

// --- Employee Training Assignments ---
router.post('/assignment', lmsController.assignTraining);
router.get('/assignments', lmsController.getAllAssignments);
router.patch('/assignment/:id/status', lmsController.updateAssignmentStatus);
router.patch('/assignment/:id/progress', lmsController.updateAssignmentProgress);
router.delete('/assignment/:id', lmsController.deleteAssignment);

// --- Assessments & Results ---
router.post('/assessment', lmsController.logAssessment);
router.get('/assessments', lmsController.getAllAssessments);

// --- Quiz Engine ---
router.post('/module/:id/questions', lmsController.addQuizQuestion);
router.get('/module/:id/questions', lmsController.getQuizQuestions);
router.delete('/question/:id', lmsController.deleteQuizQuestion);
router.post('/quiz/submit', lmsController.submitQuiz);

module.exports = router;
