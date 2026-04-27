import axiosInstance from './axiosInstance';

export const getTeams = (params) => axiosInstance.get('/admin/teams', { params });
export const getDesignerAssignments = (params) => axiosInstance.get('/admin/designers', { params });
export const getSalesOverview = (params) => axiosInstance.get('/admin/sales', { params });
export const getMaintenanceOverview = (params) => axiosInstance.get('/admin/maintenance', { params });
export const createTeam = (data) => axiosInstance.post('/admin/teams', data);

