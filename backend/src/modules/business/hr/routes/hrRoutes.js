const express = require('express');
const router = express.Router();
const { getDashboardMetrics } = require('../controllers/hrController');
const { getEmployees, getDepartmentsAndDesignations, createEmployee, getEmployeeById, updateEmployee, deleteEmployee, updateEmployeeRole, getEmployeeHierarchy, registerEmployee, getPendingRegistrations, approveRegistration, rejectRegistration, updateOrgChartPlacements } = require('../controllers/employeeController');
const { createCandidate, getCandidates, updateCandidateStatus, getCandidateById, updateCandidate, deleteCandidate } = require('../controllers/candidateController');
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

// Public route for email downloads (secured by unguessable UUID)
router.get('/payrolls/download/:payroll_id', payrollController.downloadPayslip);

const { 
  getAttendance, getAttendanceMetrics, clockIn, clockOut, 
  updateAttendance, createManualAttendance, getAttendanceMuster,
  generateVerificationToken, getVerificationSession, verifyAttendance 
} = require('../controllers/attendanceController');

router.get('/attendance/verify/:token', getVerificationSession);
router.post('/attendance/verify', verifyAttendance);

// Public Candidate route
router.post('/candidates', uploadCandidate.any(), createCandidate);

router.post('/employees/register', registerEmployee);

router.use(verifyToken);
// router.use(requireModuleAccess('hr'));

router.put('/candidates/:id/status', updateCandidateStatus);
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

const onboardingRoutes = require('./onboardingRoutes');
router.use('/onboarding', onboardingRoutes);

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
