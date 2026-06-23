const express = require('express');
const router = express.Router();
const inventoryController = require('./inventoryController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const customCategoryController = require('./customCategoryController');
const cache = require('../../middleware/cache');
const clearCache = require('../../middleware/clearCache');
const { verifyToken } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/rbac');

router.use(verifyToken);
router.use(requirePermission('inventory.view'));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/inventory/';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

const electronicsController = require('./electronicsController');
const electricalController = require('./electricalController');
const structuralController = require('./structuralController');

const pcbFiles = [
    { name: 'file_gerber', maxCount: 1 },
    { name: 'file_board', maxCount: 1 },
    { name: 'file_schematic', maxCount: 1 },
    { name: 'file_bom', maxCount: 1 },
    { name: 'file_stencile', maxCount: 1 },
    { name: 'file_panel_gerber', maxCount: 1 },
    { name: 'file_layer_stack', maxCount: 1 },
    { name: 'file_production_note', maxCount: 1 },
    { name: 'pcb_images', maxCount: 10 }
];

const electronicsFiles = [
    { name: 'file_datasheet', maxCount: 1 },
    { name: 'file_wiring', maxCount: 1 },
    { name: 'file_manual', maxCount: 1 },
    { name: 'file_test_report', maxCount: 1 },
    { name: 'file_calib_cert', maxCount: 1 },
    { name: 'file_warranty', maxCount: 1 },
    { name: 'file_invoice', maxCount: 1 },
    { name: 'part_images', maxCount: 10 }
];

const electricalFiles = [
    { name: 'file_datasheet', maxCount: 1 },
    { name: 'file_wiring', maxCount: 1 },
    { name: 'file_manual', maxCount: 1 },
    { name: 'file_test_report', maxCount: 1 },
    { name: 'file_calib_cert', maxCount: 1 },
    { name: 'file_compliance', maxCount: 1 },
    { name: 'file_warranty', maxCount: 1 },
    { name: 'file_invoice', maxCount: 1 },
    { name: 'part_images', maxCount: 10 }
];
const structuralFiles = [
    { name: 'file_2d_drawing', maxCount: 1 },
    { name: 'file_3d_model', maxCount: 1 },
    { name: 'file_fabrication_drawing', maxCount: 1 },
    { name: 'file_assembly_drawing', maxCount: 1 },
    { name: 'file_cutting', maxCount: 1 },
    { name: 'part_images', maxCount: 10 }
];
// Custom Category Fields routes (shared for all 3 modules)
router.get('/:module/custom-categories', cache(60), customCategoryController.getCustomCategories);
router.get('/:module/categories/:categoryName/fields', cache(60), customCategoryController.getCategoryFields);
router.post('/:module/categories/:categoryName/fields', customCategoryController.saveCategoryFields);
router.delete('/:module/categories/:categoryName', customCategoryController.deleteCustomCategory);


router.get('/pcb', cache(60), inventoryController.getPCBs);
router.get('/pcb/:id', cache(60), inventoryController.getPCBById);
router.post('/pcb', requirePermission('inventory.create'), upload.fields(pcbFiles), clearCache('/api/inventory'), inventoryController.createPCB);
router.post('/pcb/:id/add-stock', requirePermission('inventory.edit'), clearCache('/api/inventory'), inventoryController.addPCBStock);
router.put('/pcb/:id', requirePermission('inventory.edit'), upload.fields(pcbFiles), clearCache('/api/inventory'), inventoryController.updatePCB);
router.delete('/pcb/:id', requirePermission('inventory.delete'), clearCache('/api/inventory'), inventoryController.deletePCB);
router.delete('/pcb/:id/image', requirePermission('inventory.edit'), clearCache('/api/inventory'), inventoryController.deletePCBImage);
router.delete('/pcb/:id/file', requirePermission('inventory.edit'), clearCache('/api/inventory'), inventoryController.deletePCBFile);

router.get('/electronics', cache(60), electronicsController.getElectronicsParts);
router.get('/electronics/:id', cache(60), electronicsController.getElectronicsPartById);
router.post('/electronics', requirePermission('inventory.create'), upload.fields(electronicsFiles), clearCache('/api/inventory'), electronicsController.createElectronicsPart);
router.post('/electronics/:id/add-stock', requirePermission('inventory.edit'), clearCache('/api/inventory'), electronicsController.addElectronicsStock);
router.put('/electronics/:id', requirePermission('inventory.edit'), upload.fields(electronicsFiles), clearCache('/api/inventory'), electronicsController.updateElectronicsPart);
router.delete('/electronics/:id', requirePermission('inventory.delete'), clearCache('/api/inventory'), electronicsController.deleteElectronicsPart);
router.delete('/electronics/:id/image', requirePermission('inventory.edit'), clearCache('/api/inventory'), electronicsController.deleteElectronicsImage);
router.delete('/electronics/:id/file', requirePermission('inventory.edit'), clearCache('/api/inventory'), electronicsController.deleteElectronicsFile);

router.get('/electrical', cache(60), electricalController.getElectricalParts);
router.get('/electrical/:id', cache(60), electricalController.getElectricalPartById);
router.post('/electrical', requirePermission('inventory.create'), upload.fields(electricalFiles), clearCache('/api/inventory'), electricalController.createElectricalPart);
router.post('/electrical/:id/add-stock', requirePermission('inventory.edit'), clearCache('/api/inventory'), electricalController.addElectricalStock);
router.put('/electrical/:id', requirePermission('inventory.edit'), upload.fields(electricalFiles), clearCache('/api/inventory'), electricalController.updateElectricalPart);
router.delete('/electrical/:id', requirePermission('inventory.delete'), clearCache('/api/inventory'), electricalController.deleteElectricalPart);
router.delete('/electrical/:id/image', requirePermission('inventory.edit'), clearCache('/api/inventory'), electricalController.deleteElectricalImage);
router.delete('/electrical/:id/file', requirePermission('inventory.edit'), clearCache('/api/inventory'), electricalController.deleteElectricalFile);

router.get('/structural', cache(60), structuralController.getStructuralParts);
router.get('/structural/:id', cache(60), structuralController.getStructuralPartById);
router.post('/structural', requirePermission('inventory.create'), upload.fields(structuralFiles), clearCache('/api/inventory'), structuralController.createStructuralPart);
router.post('/structural/:id/add-stock', requirePermission('inventory.edit'), clearCache('/api/inventory'), structuralController.addStructuralStock);
router.put('/structural/:id', requirePermission('inventory.edit'), upload.fields(structuralFiles), clearCache('/api/inventory'), structuralController.updateStructuralPart);
router.delete('/structural/:id', requirePermission('inventory.delete'), clearCache('/api/inventory'), structuralController.deleteStructuralPart);
router.delete('/structural/:id/image', requirePermission('inventory.edit'), clearCache('/api/inventory'), structuralController.deleteStructuralImage);
router.delete('/structural/:id/file', requirePermission('inventory.edit'), clearCache('/api/inventory'), structuralController.deleteStructuralFile);



module.exports = router;
