const express = require('express');
const router = express.Router();
const companyController = require('./companyController');
const { verifyToken, isAdmin } = require('../../middleware/auth');
const cache = require('../../middleware/cache');
const clearCache = require('../../middleware/clearCache');

router.use(verifyToken);

router.get('/', cache(60), companyController.getCompanies);
router.post('/', isAdmin, clearCache('/api/companies'), companyController.createCompany);
router.put('/:id', isAdmin, clearCache('/api/companies'), companyController.updateCompany);
router.delete('/:id', isAdmin, clearCache('/api/companies'), companyController.deleteCompany);

router.get('/:companyId/sub', cache(60), companyController.getSubCompanies);
router.post('/:companyId/sub', isAdmin, clearCache('/api/companies'), companyController.createSubCompany);
router.put('/sub/:id', isAdmin, clearCache('/api/companies'), companyController.updateSubCompany);
router.delete('/sub/:id', isAdmin, clearCache('/api/companies'), companyController.deleteSubCompany);

module.exports = router;
