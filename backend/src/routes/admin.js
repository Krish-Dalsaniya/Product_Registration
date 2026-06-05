const express = require('express');
const adminController = require('../controllers/adminController');
const { verifyToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const cache = require('../middleware/cache');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(verifyToken);
// Remove global requireRole('Admin') so we can do granular checks
// router.use(requireRole('Admin'));

const utilityController = require('../controllers/adminUtilityController');
const adminTeamController = require('../controllers/adminTeamController');

router.get('/stats', cache(60), requirePermission('dashboard.view'), adminController.getAdminStats);
router.get('/users', requirePermission('users.view'), adminController.getUsers);
router.post('/users', requirePermission('users.create'), upload.single('image'), adminController.createUser);
router.put('/users/:userId', requirePermission('users.edit'), upload.single('image'), adminController.updateUser);
router.get('/users/:userId', requirePermission('users.view'), adminController.getUserById);
router.delete('/users/:userId', requirePermission('users.delete'), adminController.deleteUser);
router.delete('/users/:userId/image', requirePermission('users.edit'), adminController.removeUserImage);
router.get('/designers', requirePermission('users.view'), adminController.getDesigners);
router.get('/teams', requirePermission('teams.view'), adminController.getTeams);
router.post('/teams', requirePermission('teams.create'), adminTeamController.createTeam);
router.put('/teams/:id', requirePermission('teams.edit'), adminTeamController.updateTeam);
router.delete('/teams/:id', requirePermission('teams.delete'), adminTeamController.deleteTeam);
router.get('/sales', requirePermission('sales.view'), adminController.getSales);
router.get('/maintenance', requirePermission('products.view'), adminController.getMaintenance);

router.get('/projects', utilityController.getProjects);
router.get('/products', utilityController.getProducts);

module.exports = router;
