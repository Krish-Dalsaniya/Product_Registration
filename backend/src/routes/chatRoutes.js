const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { verifyToken } = require('../middleware/auth');

// All chat routes require authentication
router.use(verifyToken);

// Get available users for chat
router.get('/users', chatController.getChatUsers);

// Get total unread count across all conversations
router.get('/unread-count', chatController.getUnreadCount);

// Get chat history with a specific user
router.get('/messages/:userId', chatController.getChatHistory);

// Send a message
router.post('/messages', chatController.sendMessage);

// Mark messages from a specific user as read
router.put('/messages/read/:userId', chatController.markAsRead);

// Delete a specific message
router.delete('/messages/:messageId', chatController.deleteMessage);

// Clear chat history with a specific user
router.delete('/messages/user/:userId', chatController.clearChat);

module.exports = router;
