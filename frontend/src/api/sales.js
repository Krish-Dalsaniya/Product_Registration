import axiosInstance from './axiosInstance';

export const getMyProfile = () => axiosInstance.get('/sales/profile');
export const updateMyProfile = (data) => axiosInstance.put('/sales/profile', data);
export const getMyProducts = () => axiosInstance.get('/sales/products');
export const getMyOpportunities = (params) => axiosInstance.get('/sales/opportunities', { params });
export const createOpportunity = (data) => axiosInstance.post('/sales/opportunities', data);
export const updateOpportunity = (id, data) => axiosInstance.put(`/sales/opportunities/${id}`, data);
export const deleteOpportunity = (id) => axiosInstance.delete(`/sales/opportunities/${id}`);
