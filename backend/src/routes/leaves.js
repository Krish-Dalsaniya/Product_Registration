const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getLeaveSummary, getUpcomingLeaves, applyForLeave, getCalendarData } = require('../controllers/leavesController');

router.use(verifyToken);

router.get('/summary', getLeaveSummary);
router.get('/upcoming', getUpcomingLeaves);
router.get('/calendar', getCalendarData);
router.post('/apply', applyForLeave);

module.exports = router;
