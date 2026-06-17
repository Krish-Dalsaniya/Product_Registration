const express = require('express');
const router = express.Router();
const { getDashboardMetrics } = require('../controllers/hrController');
const { getEmployees, getDepartmentsAndDesignations, createEmployee, getEmployeeById, updateEmployee, deleteEmployee, updateEmployeeRole } = require('../controllers/employeeController');
const { verifyToken } = require('../../../../middleware/auth');
// In a full implementation, we would import requireModuleAccess middleware here
// const { requireModuleAccess } = require('../../../core/permissions/middleware');

router.use(verifyToken);
// router.use(requireModuleAccess('hr'));

router.get('/dashboard/metrics', getDashboardMetrics);
router.get('/employees', getEmployees);
router.post('/employees', createEmployee);
router.get('/employees/:id', getEmployeeById);
router.put('/employees/:id', updateEmployee);
router.delete('/employees/:id', deleteEmployee);
router.put('/employees/:id/role', updateEmployeeRole);
router.get('/metadata', getDepartmentsAndDesignations);

const { getAttendance, getAttendanceMetrics, clockIn, clockOut, updateAttendance, createManualAttendance } = require('../controllers/attendanceController');

router.get('/attendance', getAttendance);
router.post('/attendance', createManualAttendance);
router.get('/attendance/metrics', getAttendanceMetrics);
router.post('/attendance/clock-in', clockIn);
router.post('/attendance/clock-out', clockOut);
router.put('/attendance/:id', updateAttendance);

module.exports = router;
