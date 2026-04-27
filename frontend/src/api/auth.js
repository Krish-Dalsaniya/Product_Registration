import axiosInstance from './axiosInstance';

export const loginApi = (email, password) => axiosInstance.post('/auth/login', { email, password });
export const refreshApi = (refreshToken) => axiosInstance.post('/auth/refresh', { refreshToken });
export const logoutApi = () => axiosInstance.post('/auth/logout');
