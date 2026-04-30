import axiosInstance from './axiosInstance';

export const getCategories = () => axiosInstance.get('/categories');
export const createCategory = (data) => axiosInstance.post('/categories', data);
export const updateCategory = (id, data) => axiosInstance.put(`/categories/${id}`, data);
export const deleteCategory = (id) => axiosInstance.delete(`/categories/${id}`);

export const getSubCategories = (categoryId) => axiosInstance.get(`/categories/${categoryId}/sub`);
export const createSubCategory = (categoryId, data) => axiosInstance.post(`/categories/${categoryId}/sub`, data);
export const updateSubCategory = (id, data) => axiosInstance.put(`/categories/sub/${id}`, data);
export const deleteSubCategory = (id) => axiosInstance.delete(`/categories/sub/${id}`);
