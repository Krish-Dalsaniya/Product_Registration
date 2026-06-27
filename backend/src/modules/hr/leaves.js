const express = require('express');
const router = express.Router();
const { verifyToken } = require('../../middleware/auth');
const { getLeaveSummary, getUpcomingLeaves, applyForLeave, getCalendarData, getAllPendingRequests, updateLeaveStatus, getUserLeaveBalances, getEmployeeLeaveData, getMyLeaveHistory } = require('./leavesController');

router.use(verifyToken);

router.get('/summary', getLeaveSummary);
router.get('/upcoming', getUpcomingLeaves);
router.get('/calendar', getCalendarData);
router.get('/balances', getUserLeaveBalances);
router.get('/my-history', getMyLeaveHistory);
router.post('/apply', applyForLeave);

// Admin Routes
router.get('/requests/pending', getAllPendingRequests);
router.put('/requests/:id/status', updateLeaveStatus);
router.get('/employee/:id', getEmployeeLeaveData);

module.exports = router;
