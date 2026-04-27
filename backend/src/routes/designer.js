const express = require('express');
const designerController = require('../controllers/designerController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(verifyToken);
router.use(requireRole('Designer'));

router.get('/profile', designerController.getProfile);
router.put('/profile', designerController.updateProfile);
router.get('/team', designerController.getTeam);
router.get('/projects', designerController.getProjects);
router.get('/projects/:projectId', designerController.getProjectById);

module.exports = router;
