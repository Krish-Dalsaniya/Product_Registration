const express = require('express');
const router = express.Router();
const onboardingController = require('../controllers/onboardingController');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
router.get('/', onboardingController.getOnboardingRecords);
router.post('/', onboardingController.createOnboardingRecord);
router.patch('/:id/status', onboardingController.updateOnboardingStatus);
router.patch('/:id/checklist', onboardingController.updateChecklist);

module.exports = router;
