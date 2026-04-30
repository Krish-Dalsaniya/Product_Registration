import axiosInstance from './axiosInstance';

export const getCategories = () => axiosInstance.get('/categories');
export const createCategory = (data) => axiosInstance.post('/categories', data);
export const getSubCategories = (categoryId) => axiosInstance.get(`/categories/${categoryId}/sub`);
export const createSubCategory = (categoryId, data) => axiosInstance.post(`/categories/${categoryId}/sub`, data);
