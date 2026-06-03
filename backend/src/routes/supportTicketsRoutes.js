const express = require('express');
const router = express.Router();
const supportTicketController = require('../controllers/supportTicketController');
const { verifyToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All routes require authentication
router.use(verifyToken);

router.get('/', supportTicketController.getTickets);
router.get('/:id', supportTicketController.getTicketById);
router.post('/', upload.fields([{ name: 'attachments', maxCount: 5 }]), supportTicketController.createTicket);
router.put('/:id', upload.fields([{ name: 'attachments', maxCount: 5 }]), supportTicketController.updateTicket);
router.delete('/:id', supportTicketController.deleteTicket);

// Message routes
router.get('/:id/messages', supportTicketController.getTicketMessages);
router.post('/:id/messages', supportTicketController.addTicketMessage);
router.delete('/:id/messages/:messageId', supportTicketController.deleteTicketMessage);

module.exports = router;

