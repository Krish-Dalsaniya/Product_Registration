const express = require('express');
const router = express.Router();
const supportTicketController = require('./supportTicketController');
const { verifyToken } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

const { requirePermission } = require('../../middleware/rbac');

// All routes require authentication
router.use(verifyToken);
router.use(requirePermission('supporttickets.view'));

router.get('/', supportTicketController.getTickets);
router.get('/:id', supportTicketController.getTicketById);
router.post('/', requirePermission('supporttickets.create'), upload.fields([{ name: 'attachments', maxCount: 5 }]), supportTicketController.createTicket);
router.put('/:id', requirePermission('supporttickets.edit'), upload.fields([{ name: 'attachments', maxCount: 5 }]), supportTicketController.updateTicket);
router.delete('/:id', requirePermission('supporttickets.delete'), supportTicketController.deleteTicket);

// Message routes
router.get('/:id/messages', supportTicketController.getTicketMessages);
router.post('/:id/messages', supportTicketController.addTicketMessage);
router.delete('/:id/messages/:messageId', supportTicketController.deleteTicketMessage);

module.exports = router;

