const express = require('express');
const router = express.Router();
const { getPendingConversions, approveConversion, rejectConversion, getCertificate } = require('../controllers/conversionController');
const { verifyToken, isAdmin } = require('../../../../middleware/auth');

router.get('/pending', verifyToken, isAdmin, getPendingConversions);
router.get('/certificate/:type/:id', verifyToken, getCertificate);
router.post('/:id/approve', verifyToken, isAdmin, approveConversion);
router.post('/:id/reject', verifyToken, isAdmin, rejectConversion);

module.exports = router;
