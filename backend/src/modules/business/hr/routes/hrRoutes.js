const express = require('express');
const router = express.Router();
const { getDashboardMetrics } = require('../controllers/hrController');
const { getEmployees, getDepartmentsAndDesignations, createEmployee, getEmployeeById, updateEmployee, deleteEmployee, updateEmployeeRole, getEmployeeHierarchy, registerEmployee, getPendingRegistrations, approveRegistration, rejectRegistration, updateOrgChartPlacements } = require('../controllers/employeeController');
const { createCandidate, getCandidates, updateCandidateStatus, getCandidateById, updateCandidate, deleteCandidate, extractLiveCandidateInfo, updateCandidateTrelloMetadata, addCandidateComment, getCandidateComments, getCandidateActivity, reorderCandidates } = require('../controllers/candidateController');
const cefController = require('../controllers/cefController');
const openPositionsController = require('../controllers/openPositionsController');
const { verifyToken } = require('../../../../middleware/auth');
const payrollController = require('../controllers/payrollController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const candidateStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../../../../uploads/candidates');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const uploadCandidate = multer({ storage: candidateStorage });

const cefStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../../../../../uploads/cef');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const uploadCef = multer({ storage: cefStorage });

// Public route for email downloads (secured by unguessable UUID)
router.get('/payrolls/download/:payroll_id', payrollController.downloadPayslip);

const { 
  getAttendance, getAttendanceMetrics, clockIn, clockOut, 
  updateAttendance, createManualAttendance, getAttendanceMuster,
  generateVerificationToken, getVerificationSession, verifyAttendance 
} = require('../controllers/attendanceController');

router.get('/attendance/verify/:token', getVerificationSession);
router.post('/attendance/verify', verifyAttendance);

// Public Candidate routes
router.post('/candidates/extract-live', uploadCandidate.single('document'), extractLiveCandidateInfo);
router.post('/candidates', uploadCandidate.any(), createCandidate);

router.post('/employees/register', registerEmployee);

// Public route for CEF downloads and views
router.get('/cef-forms/download/:id', cefController.downloadForm);
router.get('/cef-forms/view/:id', cefController.viewForm);

// Public route for Open Positions (if they need to be fetched without auth by applicants)
router.get('/open-positions', openPositionsController.getPositions);

router.use(verifyToken);
// router.use(requireModuleAccess('hr'));

router.put('/candidates/reorder', reorderCandidates);
router.put('/candidates/:id/status', updateCandidateStatus);
router.put('/candidates/:id/trello', updateCandidateTrelloMetadata);
router.get('/candidates/:id/comments', getCandidateComments);
router.post('/candidates/:id/comments', addCandidateComment);
router.get('/candidates/:id/activity', getCandidateActivity);
router.get('/dashboard/metrics', getDashboardMetrics);
router.get('/candidates', getCandidates);
router.get('/candidates/:id', getCandidateById);
router.put('/candidates/:id', uploadCandidate.any(), updateCandidate);
router.delete('/candidates/:id', deleteCandidate);
router.get('/employees/hierarchy', getEmployeeHierarchy);
router.get('/employees', getEmployees);
router.post('/employees', createEmployee);
router.get('/employees/pending-registrations', getPendingRegistrations);
router.post('/employees/pending-registrations/:id/approve', approveRegistration);
router.post('/employees/pending-registrations/:id/reject', rejectRegistration);
router.get('/employees/:id', getEmployeeById);
router.put('/employees/:id', updateEmployee);
router.delete('/employees/:id', deleteEmployee);
router.put('/employees/:id/role', updateEmployeeRole);
router.get('/metadata', getDepartmentsAndDesignations);
router.post('/org-chart/placements', updateOrgChartPlacements);

// Profile-centric Org Chart Routes
const { getOrgProfiles, createOrgProfile, updateOrgProfile, deleteOrgProfile } = require('../controllers/employeeController');
router.get('/org-chart/profiles', getOrgProfiles);
router.post('/org-chart/profiles', createOrgProfile);
router.put('/org-chart/profiles/:id', updateOrgProfile);
router.delete('/org-chart/profiles/:id', deleteOrgProfile);

router.post('/attendance/verification-token', generateVerificationToken);

router.get('/attendance', getAttendance);
router.post('/attendance', createManualAttendance);
router.get('/attendance/metrics', getAttendanceMetrics);
router.get('/attendance/muster', getAttendanceMuster);
router.post('/attendance/clock-in', clockIn);
router.post('/attendance/clock-out', clockOut);
router.put('/attendance/:id', updateAttendance);

const { getHolidays, createHoliday, deleteHoliday, updateHoliday } = require('../controllers/holidayController');
router.get('/holidays', getHolidays);
router.post('/holidays', createHoliday);
router.put('/holidays/:id', updateHoliday);
router.delete('/holidays/:id', deleteHoliday);

const payrollRoutes = require('./payrollRoutes');
router.use('/payrolls', payrollRoutes);
// Onboarding
const onboardingRoutes = require('./onboardingRoutes');
router.use('/onboarding', onboardingRoutes);

// Candidate Evaluation Forms (CEF)
router.get('/cef-forms', cefController.getForms);
router.post('/cef-forms', uploadCef.single('file'), cefController.uploadForm);
router.put('/cef-forms/:id', uploadCef.single('file'), cefController.updateForm);
router.delete('/cef-forms/:id', cefController.deleteForm);

// Open Positions routes (auth required)
router.post('/open-positions', openPositionsController.createPosition);
router.put('/open-positions/:id', openPositionsController.updatePosition);
router.delete('/open-positions/:id', openPositionsController.deletePosition);

const offboardingRoutes = require('./offboardingRoutes');
router.use('/offboarding', offboardingRoutes);

const traineeRoutes = require('./traineeRoutes');
router.use('/trainees', traineeRoutes);

const claimsAdvancesController = require('../controllers/claimsAdvancesController');
const upload = require('../../../../middleware/upload');
router.get('/claims', claimsAdvancesController.getClaims);
router.post('/claims', upload.single('receipt_file'), claimsAdvancesController.createClaim);
router.put('/claims/:id/status', claimsAdvancesController.updateClaimStatus);

router.get('/advances', claimsAdvancesController.getAdvances);
router.post('/advances', claimsAdvancesController.createAdvance);
router.put('/advances/:id/status', claimsAdvancesController.updateAdvanceStatus);

module.exports = router;
