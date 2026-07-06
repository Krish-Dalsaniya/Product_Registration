const express = require('express');
const router = express.Router();
const sprintController = require('./sprintController');
const { verifyToken } = require('../../../middleware/auth');

router.use(verifyToken);

router.get('/', sprintController.getProjectSprints);
router.post('/', sprintController.createSprint);
router.get('/:id/metrics', sprintController.getSprintMetrics);
router.get('/:id', sprintController.getSprintById);
router.put('/:id', sprintController.updateSprint);
router.delete('/:id', sprintController.deleteSprint);

module.exports = router;
