const express = require('express');
const adminController = require('../controllers/adminController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(verifyToken);
router.use(requireRole('Admin'));

const utilityController = require('../controllers/adminUtilityController');

router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.get('/users/:userId', adminController.getUserById);
router.get('/designers', adminController.getDesigners);
router.get('/teams', adminController.getTeams);
router.post('/teams', require('../controllers/adminTeamController').createTeam);
router.get('/sales', adminController.getSales);
router.get('/maintenance', adminController.getMaintenance);

router.get('/projects', utilityController.getProjects);
router.get('/products', utilityController.getProducts);

module.exports = router;
