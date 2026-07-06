const express = require('express');
const router = express.Router();
const epicController = require('./epicController');
const { verifyToken } = require('../../../middleware/auth');

router.use(verifyToken);

router.get('/', epicController.getProjectEpics);
router.post('/', epicController.createEpic);
router.get('/:id', epicController.getEpicById);
router.put('/:id', epicController.updateEpic);
router.delete('/:id', epicController.deleteEpic);

module.exports = router;
