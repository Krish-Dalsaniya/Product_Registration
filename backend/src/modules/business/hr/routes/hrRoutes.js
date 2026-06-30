const express = require('express');
const router = express.Router();
const { getDashboardMetrics } = require('../controllers/hrController');
const { getEmployees, getDepartmentsAndDesignations, createEmployee, getEmployeeById, updateEmployee, deleteEmployee, updateEmployeeRole, getEmployeeHierarchy, registerEmployee, getPendingRegistrations, approveRegistration, rejectRegistration } = require('../controllers/employeeController');
const { verifyToken } = require('../../../../middleware/auth');
const payrollController = require('../controllers/payrollController');

// Public route for email downloads (secured by unguessable UUID)
router.get('/payrolls/download/:payroll_id', payrollController.downloadPayslip);

const { 
  getAttendance, getAttendanceMetrics, clockIn, clockOut, 
  updateAttendance, createManualAttendance, getAttendanceMuster,
  generateVerificationToken, getVerificationSession, verifyAttendance 
} = require('../controllers/attendanceController');

// Public attendance verification routes (QR scan)
router.get('/attendance/verify/:token', getVerificationSession);
router.post('/attendance/verify', verifyAttendance);

router.post('/employees/register', registerEmployee);

router.use(verifyToken);
// router.use(requireModuleAccess('hr'));

router.get('/dashboard/metrics', getDashboardMetrics);
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
