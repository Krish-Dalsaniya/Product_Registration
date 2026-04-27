import axiosInstance from './axiosInstance';

export const getMyProfile = () => axiosInstance.get('/designer/profile');
export const updateMyProfile = (data) => axiosInstance.put('/designer/profile', data);
export const getMyTeam = () => axiosInstance.get('/designer/team');
export const getMyProjects = () => axiosInstance.get('/designer/projects');
export const getProjectById = (id) => axiosInstance.get(`/designer/projects/${id}`);
