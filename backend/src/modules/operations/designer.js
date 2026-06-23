const express = require('express');
const designerController = require('./designerController');
const { verifyToken } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');

const router = express.Router();

router.use(verifyToken);
router.use(requirePermission('teams.view'));

router.get('/profile', designerController.getProfile);
router.put('/profile', designerController.updateProfile);
router.get('/team', designerController.getTeam);
router.get('/projects', designerController.getProjects);
router.get('/projects/:projectId', designerController.getProjectById);

module.exports = router;
