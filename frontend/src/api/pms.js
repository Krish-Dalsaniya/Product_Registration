import axiosInstance from './axiosInstance';

export const getClosures = (params) => axiosInstance.get('/pms/closures', { params });
export const getClosureById = (id) => axiosInstance.get(`/pms/closures/${id}`);
export const createClosure = (data) => axiosInstance.post('/pms/closures', data);
export const updateClosure = (id, data) => axiosInstance.put(`/pms/closures/${id}`, data);
export const deleteClosure = (id) => axiosInstance.delete(`/pms/closures/${id}`);
export const getClosureMetrics = () => axiosInstance.get('/pms/closures/metrics');

export const getProjects = (params) => axiosInstance.get('/pms/projects', { params });
export const getProjectById = (id) => axiosInstance.get(`/pms/projects/${id}`);
export const createProject = (data) => axiosInstance.post('/pms/projects', data);
export const updateProject = (id, data) => axiosInstance.put(`/pms/projects/${id}`, data);
export const deleteProject = (id) => axiosInstance.delete(`/pms/projects/${id}`);
export const getProjectMetrics = () => axiosInstance.get('/pms/projects/metrics');
