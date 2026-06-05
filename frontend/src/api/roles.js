import api from './axiosInstance';

export const getRoles = () => api.get('/roles');
export const getRoleById = (id) => api.get(`/roles/${id}`);
export const createRole = (data) => api.post('/roles', data);
export const updateRole = (id, data) => api.put(`/roles/${id}`, data);
export const deleteRole = (id) => api.delete(`/roles/${id}`);
export const getPermissions = () => api.get('/roles/permissions');
