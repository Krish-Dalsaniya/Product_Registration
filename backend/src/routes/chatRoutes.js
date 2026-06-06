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

// --- GROUP CHAT ROUTES ---

// Get all groups the current user is a member of
router.get('/groups', chatController.getChatGroups);

// Create a new group
router.post('/groups', chatController.createChatGroup);

// Get chat history for a specific group
router.get('/groups/:groupId/messages', chatController.getGroupHistory);

// Get members for a specific group
router.get('/groups/:groupId/members', chatController.getGroupMembers);

// Add members to a group (Admin only)
router.post('/groups/:groupId/members', chatController.addGroupMembers);

// Remove a member from a group (Admin or self)
router.delete('/groups/:groupId/members/:userId', chatController.removeGroupMember);

// Delete a group (Admin only)
router.delete('/groups/:groupId', chatController.deleteChatGroup);

module.exports = router;
