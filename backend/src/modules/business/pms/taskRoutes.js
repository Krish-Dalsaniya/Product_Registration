const express = require('express');
const router = express.Router();
const taskController = require('./taskController');
const { validateTask } = require('./taskValidation');
const { verifyToken } = require('../../../middleware/auth');

router.use(verifyToken);

router.get('/metrics', taskController.getMetrics);
router.get('/', taskController.getAllTasks);
router.get('/:id', taskController.getTaskById);
router.post('/', validateTask, taskController.createTask);
router.put('/:id', validateTask, taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

router.put('/:id/status', taskController.updateTaskStatus);

router.get('/:id/comments', taskController.getTaskComments);
router.post('/:id/comments', taskController.addTaskComment);

router.get('/:id/time-logs', taskController.getTaskTimeLogs);
router.post('/:id/time-logs', taskController.addTimeLog);

router.get('/:id/activity', taskController.getTaskActivityLogs);

module.exports = router;
