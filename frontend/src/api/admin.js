import axiosInstance from './axiosInstance';

export const getUsers = (params) => axiosInstance.get('/admin/users', { params });
export const getUserById = (userId) => axiosInstance.get(`/admin/users/${userId}`);
export const getDesigners = (params) => axiosInstance.get('/admin/designers', { params });
export const getDesignerById = (id) => axiosInstance.get(`/admin/designers/${id}`);
export const getTeams = () => axiosInstance.get('/admin/teams');
export const getSalesUsers = (params) => axiosInstance.get('/admin/sales', { params });
export const getSalesById = (id) => axiosInstance.get(`/admin/sales/${id}`);
export const getMaintenanceUsers = (params) => axiosInstance.get('/admin/maintenance', { params });
export const getMaintenanceById = (id) => axiosInstance.get(`/admin/maintenance/${id}`);
export const createUser = (data) => axiosInstance.post('/admin/users', data);

