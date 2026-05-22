const db = require('../config/db');
const { sendSuccess } = require('../utils/response');

// Fetch all active users to chat with (excluding the current user)
const getChatUsers = async (req, res, next) => {
  try {
    const currentUserId = req.user.user_id; // From authMiddleware

    // Get users along with their role names, and count of unread messages sent to the current user
    const query = `
      SELECT 
        u.user_id, 
        u.full_name, 
        u.email, 
        r.role_name,
        COALESCE(
          (SELECT COUNT(*) 
           FROM chat_messages cm 
           WHERE cm.sender_id = u.user_id 
             AND cm.receiver_id = $1 
             AND cm.is_read = FALSE), 
          0
        )::int as unread_count,
        (SELECT MAX(created_at) 
         FROM chat_messages cm 
         WHERE (cm.sender_id = u.user_id AND cm.receiver_id = $1)
            OR (cm.sender_id = $1 AND cm.receiver_id = u.user_id)
        ) as last_message_at
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE u.user_id != $1 AND u.is_active = TRUE
      ORDER BY last_message_at DESC NULLS LAST, r.role_name, u.full_name
    `;

    const result = await db.query(query, [currentUserId]);
    
    // Group users by role for easier frontend rendering (optional, frontend can also group)
    const users = result.rows;

    sendSuccess(res, users);
  } catch (error) {
    next(error);
  }
};

// Fetch chat history between current user and another user
const getChatHistory = async (req, res, next) => {
  try {
    const currentUserId = req.user.user_id;
    const { userId: otherUserId } = req.params;

    const query = `
      SELECT message_id, sender_id, receiver_id, message, is_read, created_at
      FROM chat_messages
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC
    `;

    const result = await db.query(query, [currentUserId, otherUserId]);

    sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
};

// Send a new message
const sendMessage = async (req, res, next) => {
  try {
    const currentUserId = req.user.user_id;
    const { receiver_id, message } = req.body;

    if (!receiver_id || !message || !message.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Receiver ID and message content are required' } });
    }

    const query = `
      INSERT INTO chat_messages (sender_id, receiver_id, message)
      VALUES ($1, $2, $3)
      RETURNING message_id, sender_id, receiver_id, message, is_read, created_at
    `;

    const result = await db.query(query, [currentUserId, receiver_id, message.trim()]);

    sendSuccess(res, result.rows[0], 'Message sent successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Mark messages from a specific user as read
const markAsRead = async (req, res, next) => {
  try {
    const currentUserId = req.user.user_id;
    const { userId: senderId } = req.params;

    const query = `
      UPDATE chat_messages
      SET is_read = TRUE
      WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE
    `;

    await db.query(query, [senderId, currentUserId]);

    sendSuccess(res, null, 'Messages marked as read');
  } catch (error) {
    next(error);
  }
};

// Fetch total unread count for current user
const getUnreadCount = async (req, res, next) => {
  try {
    const currentUserId = req.user.user_id;

    const query = `
      SELECT COUNT(*) as total_unread
      FROM chat_messages
      WHERE receiver_id = $1 AND is_read = FALSE
    `;

    const result = await db.query(query, [currentUserId]);
    
    sendSuccess(res, { total_unread: parseInt(result.rows[0].total_unread) });
  } catch (error) {
    next(error);
  }
};

// Delete a specific message
const deleteMessage = async (req, res, next) => {
  try {
    const currentUserId = req.user.user_id;
    const { messageId } = req.params;

    const query = `
      DELETE FROM chat_messages 
      WHERE message_id = $1 AND sender_id = $2
      RETURNING message_id
    `;
    const result = await db.query(query, [messageId, currentUserId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Message not found or unauthorized' } });
    }

    sendSuccess(res, null, 'Message deleted');
  } catch (error) {
    next(error);
  }
};

// Clear entire chat history with a specific user
const clearChat = async (req, res, next) => {
  try {
    const currentUserId = req.user.user_id;
    const { userId: otherUserId } = req.params;

    const query = `
      DELETE FROM chat_messages 
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
    `;
    await db.query(query, [currentUserId, otherUserId]);

    sendSuccess(res, null, 'Chat history cleared');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChatUsers,
  getChatHistory,
  sendMessage,
  markAsRead,
  getUnreadCount,
  deleteMessage,
  clearChat
};
