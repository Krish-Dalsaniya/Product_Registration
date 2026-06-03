import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSupportTickets,
  getSupportTicketById,
  createSupportTicket,
  updateSupportTicket,
  deleteSupportTicket,
  getSupportTicketMessages,
  addSupportTicketMessage
} from '../api/supportTickets';

// --- Support Tickets Hooks ---

export const useSupportTickets = (params) => {
  return useQuery({
    queryKey: ['supportTickets', params],
    queryFn: async () => {
      const res = await getSupportTickets(params);
      return res.data;
    },
    keepPreviousData: true,
  });
};

export const useSupportTicket = (id) => {
  return useQuery({
    queryKey: ['supportTicket', id],
    queryFn: async () => {
      const res = await getSupportTicketById(id);
      return res.data;
    },
    enabled: !!id,
  });
};

export const useCreateSupportTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSupportTicket,
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
    },
  });
};

export const useUpdateSupportTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateSupportTicket(id, data),
    onSuccess: (data, variables) => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['supportTickets'] }),
        queryClient.invalidateQueries({ queryKey: ['supportTicket', variables.id] })
      ]);
    },
  });
};

export const useDeleteSupportTicket = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSupportTicket,
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
    },
  });
};

export const useSupportTicketMessages = (id) => {
  return useQuery({
    queryKey: ['supportTicketMessages', id],
    queryFn: async () => {
      const res = await getSupportTicketMessages(id);
      return res.data;
    },
    enabled: !!id,
    refetchInterval: 5000, // Poll every 5 seconds
  });
};

export const useAddSupportTicketMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }) => addSupportTicketMessage(id, message),
    onSuccess: (data, variables) => {
      return queryClient.invalidateQueries({ queryKey: ['supportTicketMessages', variables.id] });
    },
  });
};
