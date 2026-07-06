const express = require('express');
const router = express.Router();
const projectController = require('./projectController');
const { validateProject } = require('./projectValidation');
const { verifyToken } = require('../../../middleware/auth'); 

router.use(verifyToken);

router.get('/portfolio/metrics', projectController.getPortfolioMetrics);
router.get('/metrics', projectController.getMetrics);
router.get('/', projectController.getAllProjects);
router.get('/:id', projectController.getProjectById);
router.post('/', validateProject, projectController.createProject);
router.put('/:id', validateProject, projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

module.exports = router;
