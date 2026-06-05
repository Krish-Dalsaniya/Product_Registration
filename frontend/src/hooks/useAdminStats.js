import { useQuery } from '@tanstack/react-query';
import { getAdminStats } from '../api/admin';

export const useAdminStats = (options = {}) => {
  return useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const response = await getAdminStats();
      return response.data; // Return the full response containing { success, data }
    },
    ...options,
  });
};
