import axiosInstance from './axiosInstance';

export const getMyProfile = () => axiosInstance.get('/maintenance/profile');
export const updateMyProfile = (data) => axiosInstance.put('/maintenance/profile', data);
export const getMyTasks = (params) => axiosInstance.get('/maintenance/tasks', { params });
export const getTaskById = (id) => axiosInstance.get(`/maintenance/tasks/${id}`);
export const updateTaskStatus = (id, status) => axiosInstance.put(`/maintenance/tasks/${id}`, { status });
