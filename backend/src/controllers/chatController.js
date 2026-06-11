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
        u.image_url,
        r.role_name,
        COALESCE(
          (SELECT COUNT(*) 
           FROM chat_messages cm 
           WHERE cm.sender_id = u.user_id 
             AND cm.receiver_id = $1 
             AND cm.is_read = FALSE
             AND NOT EXISTS (
               SELECT 1 FROM chat_message_deletions cmd WHERE cmd.message_id = cm.message_id AND cmd.user_id = $1
             )), 
          0
        )::int as unread_count,
        (SELECT MAX(created_at) 
         FROM chat_messages cm 
         WHERE ((cm.sender_id = u.user_id AND cm.receiver_id = $1)
            OR (cm.sender_id = $1 AND cm.receiver_id = u.user_id))
           AND NOT EXISTS (
             SELECT 1 FROM chat_message_deletions cmd WHERE cmd.message_id = cm.message_id AND cmd.user_id = $1
           )
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
      WHERE ((sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1))
        AND NOT EXISTS (
          SELECT 1 FROM chat_message_deletions cmd WHERE cmd.message_id = chat_messages.message_id AND cmd.user_id = $1
        )
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
    const { receiver_id, group_id, message } = req.body;

    if ((!receiver_id && !group_id) || !message || !message.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Receiver ID or Group ID and message content are required' } });
    }

    if (group_id) {
      const roleName = req.user.role_name;
      // Check if user is a member of the group, EXCEPT for Admins
      if (roleName !== 'Admin' && roleName !== 'Superadmin' && roleName !== 'Super Admin') {
        const memberCheck = await db.query('SELECT 1 FROM chat_group_members WHERE group_id = $1 AND user_id = $2', [group_id, currentUserId]);
        if (memberCheck.rows.length === 0) {
          return res.status(403).json({ success: false, error: { message: 'You are not a member of this group' } });
        }
      }
      
      const query = `
        INSERT INTO chat_messages (sender_id, group_id, message)
        VALUES ($1, $2, $3)
        RETURNING message_id, sender_id, group_id, message, is_read, created_at
      `;
      const result = await db.query(query, [currentUserId, group_id, message.trim()]);
      return sendSuccess(res, result.rows[0], 'Group message sent successfully', 201);
    } else {
      const query = `
        INSERT INTO chat_messages (sender_id, receiver_id, message)
        VALUES ($1, $2, $3)
        RETURNING message_id, sender_id, receiver_id, message, is_read, created_at
      `;
      const result = await db.query(query, [currentUserId, receiver_id, message.trim()]);
      return sendSuccess(res, result.rows[0], 'Message sent successfully', 201);
    }
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
        AND NOT EXISTS (
          SELECT 1 FROM chat_message_deletions cmd WHERE cmd.message_id = chat_messages.message_id AND cmd.user_id = $1
        )
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
      INSERT INTO chat_message_deletions (message_id, user_id)
      SELECT message_id, $1 
      FROM chat_messages 
      WHERE ((sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1))
      ON CONFLICT (message_id, user_id) DO NOTHING
    `;
    await db.query(query, [currentUserId, otherUserId]);

    sendSuccess(res, null, 'Chat history cleared');
  } catch (error) {
    next(error);
  }
};

// --- GROUP CHAT METHODS ---

const getChatGroups = async (req, res, next) => {
  try {
    const currentUserId = req.user.user_id;
    const roleName = req.user.role_name;

    let query, params;
    if (roleName === 'Admin' || roleName === 'Superadmin' || roleName === 'Super Admin') {
      query = `
        SELECT cg.group_id, cg.name, cg.created_by, cg.created_at,
               (SELECT COUNT(*) FROM chat_group_members WHERE group_id = cg.group_id)::int as member_count,
               (SELECT MAX(created_at) FROM chat_messages WHERE group_id = cg.group_id) as last_message_at
        FROM chat_groups cg
        ORDER BY last_message_at DESC NULLS LAST, cg.name ASC
      `;
      params = [];
    } else {
      query = `
        SELECT cg.group_id, cg.name, cg.created_by, cg.created_at,
               (SELECT COUNT(*) FROM chat_group_members WHERE group_id = cg.group_id)::int as member_count,
               (SELECT MAX(created_at) FROM chat_messages WHERE group_id = cg.group_id) as last_message_at
        FROM chat_groups cg
        JOIN chat_group_members cgm ON cg.group_id = cgm.group_id
        WHERE cgm.user_id = $1
        ORDER BY last_message_at DESC NULLS LAST, cg.name ASC
      `;
      params = [currentUserId];
    }
    const result = await db.query(query, params);
    sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
};

const createChatGroup = async (req, res, next) => {
  try {
    const currentUserId = req.user.user_id;
    const { name, memberIds } = req.body; // memberIds: array of user UUIDs

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Group name is required' } });
    }

    // Begin transaction
    await db.query('BEGIN');

    const groupResult = await db.query(
      'INSERT INTO chat_groups (name, created_by) VALUES ($1, $2) RETURNING *',
      [name.trim(), currentUserId]
    );
    const groupId = groupResult.rows[0].group_id;

    // Make sure current user is in members array
    const members = new Set(memberIds || []);
    members.add(currentUserId);

    for (const userId of members) {
      await db.query(
        'INSERT INTO chat_group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [groupId, userId]
      );
    }

    await db.query('COMMIT');
    sendSuccess(res, groupResult.rows[0], 'Group created successfully', 201);
  } catch (error) {
    await db.query('ROLLBACK');
    next(error);
  }
};

const getGroupHistory = async (req, res, next) => {
  try {
    const currentUserId = req.user.user_id;
    const roleName = req.user.role_name;
    const { groupId } = req.params;

    // Check membership, EXCEPT for Admins
    if (roleName !== 'Admin' && roleName !== 'Superadmin' && roleName !== 'Super Admin') {
      const memberCheck = await db.query('SELECT 1 FROM chat_group_members WHERE group_id = $1 AND user_id = $2', [groupId, currentUserId]);
      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ success: false, error: { message: 'Not a member of this group' } });
      }
    }

    const query = `
      SELECT cm.message_id, cm.sender_id, u.full_name as sender_name, u.image_url, cm.group_id, cm.message, cm.created_at
      FROM chat_messages cm
      JOIN users u ON cm.sender_id = u.user_id
      WHERE cm.group_id = $1
      ORDER BY cm.created_at ASC
    `;
    const result = await db.query(query, [groupId]);
    sendSuccess(res, result.rows);
  } catch (error) {
    next(error);
  }
};

const getGroupMembers = async (req, res, next) => {
  try {
    const currentUserId = req.user.user_id;
    const roleName = req.user.role_name;
    const { groupId } = req.params;

    // Check membership, EXCEPT for Admins
    if (roleName !== 'Admin' && roleName !== 'Superadmin' && roleName !== 'Super Admin') {
      const memberCheck = await db.query('SELECT 1 FROM chat_group_members WHERE group_id = $1 AND user_id = $2', [groupId, currentUserId]);
      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ success: false, error: { message: 'Not a member of this group' } });
      }
    }

    const query = `
      SELECT u.user_id, u.full_name, u.email, u.image_url, r.role_name, cgm.joined_at, cg.created_by, cg.created_at as group_created_at
      FROM chat_group_members cgm
      JOIN users u ON cgm.user_id = u.user_id
      JOIN roles r ON u.role_id = r.role_id
      JOIN chat_groups cg ON cgm.group_id = cg.group_id
      WHERE cgm.group_id = $1
      ORDER BY u.full_name ASC
    `;
    const result = await db.query(query, [groupId]);
    
    // Send group info along with members
    const groupInfo = {
      members: result.rows,
      created_by: result.rows.length > 0 ? result.rows[0].created_by : null,
      created_at: result.rows.length > 0 ? result.rows[0].group_created_at : null
    };

    sendSuccess(res, groupInfo);
  } catch (error) {
    next(error);
  }
};

const removeGroupMember = async (req, res, next) => {
  try {
    const currentUserId = req.user.user_id;
    const { groupId, userId } = req.params;

    // Check if current user is the admin
    const groupCheck = await db.query('SELECT created_by FROM chat_groups WHERE group_id = $1', [groupId]);
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Group not found' } });
    }
    
    // Allow users to leave group themselves, or admin to remove them
    if (groupCheck.rows[0].created_by !== currentUserId && currentUserId !== userId) {
      return res.status(403).json({ success: false, error: { message: 'Only the group admin can remove members' } });
    }

    // Admin cannot remove themselves (unless they delete the group)
    if (groupCheck.rows[0].created_by === userId && currentUserId === userId) {
       return res.status(400).json({ success: false, error: { message: 'Admin cannot leave the group. Delete the group instead.' } });
    }

    await db.query('DELETE FROM chat_group_members WHERE group_id = $1 AND user_id = $2', [groupId, userId]);
    sendSuccess(res, null, 'Member removed successfully');
  } catch (error) {
    next(error);
  }
};

const deleteChatGroup = async (req, res, next) => {
  try {
    const currentUserId = req.user.user_id;
    const { groupId } = req.params;

    // Check if current user is the admin
    const groupCheck = await db.query('SELECT created_by FROM chat_groups WHERE group_id = $1', [groupId]);
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Group not found' } });
    }
    
    if (groupCheck.rows[0].created_by !== currentUserId) {
      return res.status(403).json({ success: false, error: { message: 'Only the group admin can delete the group' } });
    }

    await db.query('DELETE FROM chat_groups WHERE group_id = $1', [groupId]); // Cascades to members and messages
    sendSuccess(res, null, 'Group deleted successfully');
  } catch (error) {
    next(error);
  }
};

const addGroupMembers = async (req, res, next) => {
  try {
    const currentUserId = req.user.user_id;
    const { groupId } = req.params;
    const { memberIds } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'Member IDs are required' } });
    }

    // Check if current user is the admin
    const groupCheck = await db.query('SELECT created_by FROM chat_groups WHERE group_id = $1', [groupId]);
    if (groupCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Group not found' } });
    }
    
    if (groupCheck.rows[0].created_by !== currentUserId) {
      return res.status(403).json({ success: false, error: { message: 'Only the group admin can add new members' } });
    }

    await db.query('BEGIN');
    for (const userId of memberIds) {
      await db.query(
        'INSERT INTO chat_group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [groupId, userId]
      );
    }
    await db.query('COMMIT');

    sendSuccess(res, null, 'Members added successfully');
  } catch (error) {
    await db.query('ROLLBACK');
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
  clearChat,
  getChatGroups,
  createChatGroup,
  getGroupHistory,
  getGroupMembers,
  removeGroupMember,
  deleteChatGroup,
  addGroupMembers
};
