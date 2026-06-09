import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFinishedGoods, createFinishedGood, updateFinishedGood, deleteFinishedGood, getFinishedGoodsOptions, addFinishedGoodStock } from '../api/finishedGoods';

export const useFinishedGoods = (params) => {
  return useQuery({
    queryKey: ['finishedGoods', params],
    queryFn: async () => {
      const response = await getFinishedGoods(params);
      return response;
    },
    keepPreviousData: true,
  });
};

export const useFinishedGoodsOptions = () => {
  return useQuery({
    queryKey: ['finishedGoodsOptions'],
    queryFn: async () => {
      const response = await getFinishedGoodsOptions();
      return response.data;
    },
  });
};

export const useCreateFinishedGood = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFinishedGood,
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['finishedGoods'] });
    },
  });
};

export const useUpdateFinishedGood = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => updateFinishedGood(id, data),
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['finishedGoods'] });
    },
  });
};

export const useDeleteFinishedGood = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteFinishedGood,
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['finishedGoods'] });
    },
  });
};

export const useAddFinishedGoodStock = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantityToAdd }) => addFinishedGoodStock(id, quantityToAdd),
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['finishedGoods'] });
    },
  });
};
