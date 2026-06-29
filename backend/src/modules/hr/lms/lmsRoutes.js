const express = require('express');
const router = express.Router();
const lmsController = require('./lmsController');
const { verifyToken } = require('../../../middleware/auth');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configure local multer instance for large files up to 150MB
const uploadDir = path.join(__dirname, '../../../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const transcribeUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
            cb(null, `transcribe_${baseName}_${Date.now()}${ext}`);
        }
    }),
    limits: {
        fileSize: 150 * 1024 * 1024 // 150MB limit
    }
});

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
router.post('/module/:id/generate-questions', lmsController.generateQuestionsFromTranscript);
router.post('/module/:id/questions/bulk', lmsController.addQuizQuestionsBulk);
router.post('/transcribe', transcribeUpload.single('file'), lmsController.transcribeAudio);

module.exports = router;
