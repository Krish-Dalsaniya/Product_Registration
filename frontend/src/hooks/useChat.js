import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi } from '../api/chat';

export const useChatUsers = () => {
  return useQuery({
    queryKey: ['chatUsers'],
    queryFn: async () => {
      const response = await chatApi.getChatUsers();
      if (!response.success) throw new Error('Failed to fetch chat users');
      return response.data;
    },
    refetchInterval: 10000, // Poll every 10 seconds for unread counts
  });
};

export const useChatMessages = (userId) => {
  return useQuery({
    queryKey: ['chatMessages', userId],
    queryFn: async () => {
      const response = await chatApi.getChatHistory(userId);
      if (!response.success) throw new Error('Failed to fetch messages');
      // After fetching successfully, mark them as read in the background
      chatApi.markAsRead(userId);
      return response.data;
    },
    enabled: !!userId,
    refetchInterval: 3000, // Poll for new messages
  });
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ receiver_id, group_id, message, file }) => {
      let payload;
      if (file) {
        payload = new FormData();
        if (receiver_id) payload.append('receiver_id', receiver_id);
        if (group_id) payload.append('group_id', group_id);
        if (message) payload.append('message', message);
        payload.append('attachment', file);
      } else {
        payload = { receiver_id, group_id, message };
      }
      const response = await chatApi.sendMessage(payload);
      if (!response.success) throw new Error('Failed to send message');
      return response.data;
    },
    onSuccess: (data, variables) => {
      const invalidations = [queryClient.invalidateQueries({ queryKey: ['chatUsers'] })];
      if (variables.receiver_id) {
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['chatMessages', variables.receiver_id] }));
      }
      if (variables.group_id) {
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['groupMessages', variables.group_id] }));
        invalidations.push(queryClient.invalidateQueries({ queryKey: ['chatGroups'] }));
      }
      return Promise.all(invalidations);
    },
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId }) => {
      const response = await chatApi.deleteMessage(messageId);
      if (!response.success) throw new Error('Failed to delete message');
      return messageId;
    },
    onSuccess: (deletedMessageId) => {
      // Could manually filter from cache, or simply invalidate
      return queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
    },
  });
};

export const useClearChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId) => {
      const response = await chatApi.clearChat(userId);
      if (!response.success) throw new Error('Failed to clear chat');
      return userId;
    },
    onSuccess: (userId) => {
      return queryClient.invalidateQueries({ queryKey: ['chatMessages', userId] });
    },
  });
};

// --- GROUP CHAT HOOKS ---

export const useChatGroups = () => {
  return useQuery({
    queryKey: ['chatGroups'],
    queryFn: async () => {
      const response = await chatApi.getChatGroups();
      if (!response.success) throw new Error('Failed to fetch chat groups');
      return response.data;
    },
    refetchInterval: 10000,
  });
};

export const useGroupMessages = (groupId) => {
  return useQuery({
    queryKey: ['groupMessages', groupId],
    queryFn: async () => {
      const response = await chatApi.getGroupHistory(groupId);
      if (!response.success) throw new Error('Failed to fetch group messages');
      return response.data;
    },
    enabled: !!groupId,
    refetchInterval: 3000,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await chatApi.createChatGroup(data);
      if (!response.success) throw new Error('Failed to create group');
      return response.data;
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['chatGroups'] });
    },
  });
};

export const useGroupMembers = (groupId) => {
  return useQuery({
    queryKey: ['groupMembers', groupId],
    queryFn: async () => {
      const response = await chatApi.getGroupMembers(groupId);
      if (!response.success) throw new Error('Failed to fetch group members');
      return response.data;
    },
    enabled: !!groupId,
  });
};

export const useAddGroupMembers = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, memberIds }) => {
      const response = await chatApi.addGroupMembers(groupId, { memberIds });
      if (!response.success) throw new Error('Failed to add members');
      return groupId;
    },
    onSuccess: (groupId) => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groupMembers', groupId] }),
        queryClient.invalidateQueries({ queryKey: ['chatGroups'] })
      ]);
    },
  });
};

export const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, userId }) => {
      const response = await chatApi.removeGroupMember(groupId, userId);
      if (!response.success) throw new Error('Failed to remove member');
      return { groupId, userId };
    },
    onSuccess: (data) => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groupMembers', data.groupId] }),
        queryClient.invalidateQueries({ queryKey: ['chatGroups'] })
      ]);
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId) => {
      const response = await chatApi.deleteGroup(groupId);
      if (!response.success) throw new Error('Failed to delete group');
      return groupId;
    },
    onSuccess: (groupId) => {
      return queryClient.invalidateQueries({ queryKey: ['chatGroups'] });
    },
  });
};

