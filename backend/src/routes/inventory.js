const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/inventory/';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage: storage });

const electronicsController = require('../controllers/electronicsController');
const electricalController = require('../controllers/electricalController');

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

router.get('/pcb', inventoryController.getPCBs);
router.get('/pcb/:id', inventoryController.getPCBById);
router.post('/pcb', upload.fields(pcbFiles), inventoryController.createPCB);
router.put('/pcb/:id', upload.fields(pcbFiles), inventoryController.updatePCB);
router.delete('/pcb/:id', inventoryController.deletePCB);
router.delete('/pcb/:id/image', inventoryController.deletePCBImage);

router.get('/electronics', electronicsController.getElectronicsParts);
router.get('/electronics/:id', electronicsController.getElectronicsPartById);
router.post('/electronics', upload.fields(electronicsFiles), electronicsController.createElectronicsPart);
router.put('/electronics/:id', upload.fields(electronicsFiles), electronicsController.updateElectronicsPart);
router.delete('/electronics/:id', electronicsController.deleteElectronicsPart);

router.get('/electrical', electricalController.getElectricalParts);
router.get('/electrical/:id', electricalController.getElectricalPartById);
router.post('/electrical', upload.fields(electricalFiles), electricalController.createElectricalPart);
router.put('/electrical/:id', upload.fields(electricalFiles), electricalController.updateElectricalPart);
router.delete('/electrical/:id', electricalController.deleteElectricalPart);
router.delete('/electrical/:id/image', electricalController.deleteElectricalImage);

module.exports = router;
