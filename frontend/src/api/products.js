import axiosInstance from './axiosInstance';

export const getProducts = (params) => axiosInstance.get('/products', { params });
export const createProduct = (data) => axiosInstance.post('/products', data);
export const updateProduct = (id, data) => axiosInstance.put(`/products/${id}`, data);
