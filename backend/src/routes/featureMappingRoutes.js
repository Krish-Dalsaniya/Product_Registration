const express = require('express');
const featureMappingController = require('../controllers/featureMappingController');
const { verifyToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(verifyToken);

router.get('/', featureMappingController.getFeatureMappings);
router.post('/', requireRole('Admin'), featureMappingController.createFeatureMapping);
router.put('/:id', requireRole('Admin'), featureMappingController.updateFeatureMapping);
router.delete('/:id', requireRole('Admin'), featureMappingController.deleteFeatureMapping);

module.exports = router;
