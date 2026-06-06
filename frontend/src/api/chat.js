import api from './axiosInstance';

export const chatApi = {
  // Get all active users to chat with
  getChatUsers: async () => {
    const response = await api.get('/chat/users');
    return response.data;
  },

  // Get total unread message count
  getUnreadCount: async () => {
    const response = await api.get('/chat/unread-count');
    return response.data;
  },

  // Get chat history with a specific user
  getChatHistory: async (userId) => {
    const response = await api.get(`/chat/messages/${userId}`);
    return response.data;
  },

  // Send a message
  sendMessage: async (data) => {
    const response = await api.post('/chat/messages', data);
    return response.data;
  },

  // Mark messages from a specific user as read
  markAsRead: async (userId) => {
    const response = await api.put(`/chat/messages/read/${userId}`);
    return response.data;
  },

  // Delete a specific message
  deleteMessage: async (messageId) => {
    const response = await api.delete(`/chat/messages/${messageId}`);
    return response.data;
  },

  // Clear chat history with a specific user
  clearChat: async (userId) => {
    const response = await api.delete(`/chat/messages/user/${userId}`);
    return response.data;
  },

  // --- GROUP CHAT APIs ---
  getChatGroups: async () => {
    const response = await api.get('/chat/groups');
    return response.data;
  },

  createChatGroup: async (data) => {
    const response = await api.post('/chat/groups', data);
    return response.data;
  },

  getGroupHistory: async (groupId) => {
    const response = await api.get(`/chat/groups/${groupId}/messages`);
    return response.data;
  },

  getGroupMembers: async (groupId) => {
    const response = await api.get(`/chat/groups/${groupId}/members`);
    return response.data;
  },

  addGroupMembers: async (groupId, data) => {
    const response = await api.post(`/chat/groups/${groupId}/members`, data);
    return response.data;
  },

  removeGroupMember: async (groupId, userId) => {
    const response = await api.delete(`/chat/groups/${groupId}/members/${userId}`);
    return response.data;
  },

  deleteGroup: async (groupId) => {
    const response = await api.delete(`/chat/groups/${groupId}`);
    return response.data;
  }
};
