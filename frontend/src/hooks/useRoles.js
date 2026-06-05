import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoles, getRoleById, createRole, updateRole, deleteRole, getPermissions } from '../api/roles';

export const useRoles = () => {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await getRoles();
      return data.data;
    }
  });
};

export const useRole = (id) => {
  return useQuery({
    queryKey: ['roles', id],
    queryFn: async () => {
      const { data } = await getRoleById(id);
      return data.data;
    },
    enabled: !!id
  });
};

export const usePermissions = () => {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data } = await getPermissions();
      return data.data;
    }
  });
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    }
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    }
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    }
  });
};
