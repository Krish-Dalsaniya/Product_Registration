const express = require('express');
const router = express.Router();
const offboardingController = require('../controllers/offboardingController');

router.get('/', offboardingController.getOffboardingRecords);
router.post('/', offboardingController.createOffboardingRecord);
router.patch('/:id/status', offboardingController.updateOffboardingStatus);
router.patch('/:id/checklist', offboardingController.updateChecklist);

module.exports = router;
