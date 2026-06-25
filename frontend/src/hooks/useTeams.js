import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeams, createTeam, updateTeam, deleteTeam } from '../api/adminTeams';

export const useTeams = (params) => {
  return useQuery({
    queryKey: ['teams', params],
    queryFn: async () => {
      const response = await getTeams(params);
      return response.data;
    },
  });
};

export const useCreateTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createTeam,
    onSuccess: () => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['teams'] }),
        queryClient.invalidateQueries({ queryKey: ['adminStats'] })
      ]);
    },
  });
};

export const useUpdateTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateTeam(id, data),
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
  });
};

export const useDeleteTeam = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteTeam,
    onSuccess: () => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: ['teams'] }),
        queryClient.invalidateQueries({ queryKey: ['adminStats'] })
      ]);
    },
  });
};
