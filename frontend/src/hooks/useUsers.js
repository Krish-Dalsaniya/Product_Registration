import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUsers, createUser, updateUser, deleteUser, getAdminStats, removeUserImage, resetUser2FA, resetUserPassword } from '../api/admin';

export const useUsers = (params, options = {}) => {
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const response = await getUsers(params);
      return response.data;
    },
    keepPreviousData: true,
    ...options,
  });
};

export const useAdminStats = () => {
  return useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const response = await getAdminStats();
      return response.data;
    },
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['adminStats'] })
      ]);
    },
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateUser(id, data),
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['adminStats'] })
      ]);
    },
  });
};

export const useRemoveUserImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeUserImage,
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

export const useResetUser2FA = () => {
  return useMutation({
    mutationFn: resetUser2FA,
  });
};

export const useResetUserPassword = () => {
  return useMutation({
    mutationFn: resetUserPassword,
  });
};
