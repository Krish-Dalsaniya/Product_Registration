const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payrollController');

// Salary Structures
router.get('/salary-structures', payrollController.getSalaryStructures);
router.put('/salary-structures/:employee_id', payrollController.updateSalaryStructure);

// Payrolls
router.get('/', payrollController.getPayrolls);
router.post('/generate', payrollController.generatePayroll);
router.delete('/generate', payrollController.deleteDraft);
router.post('/process', payrollController.processPayroll);
router.post('/email', payrollController.emailPayslip);

module.exports = router;
