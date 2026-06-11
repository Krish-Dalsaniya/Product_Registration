import axiosInstance from './axiosInstance';

export const loginApi = (email, password) => axiosInstance.post('/auth/login', { email, password });
export const refreshApi = () => axiosInstance.post('/auth/refresh');
export const logoutApi = () => axiosInstance.post('/auth/logout');
export const updateProfileImageApi = (formData) => axiosInstance.post('/auth/profile/image', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteProfileImageApi = () => axiosInstance.delete('/auth/profile/image');
export const verifyResetPasswordApi = (email, otp) => axiosInstance.post('/auth/reset-password/verify', { email, otp });
export const resetPasswordApi = (resetToken, newPassword) => axiosInstance.post('/auth/reset-password', { resetToken, newPassword });
export const getMeApi = () => axiosInstance.get('/auth/me');
export const setup2FaApi = () => axiosInstance.post('/auth/2fa/setup');
export const verify2FaApi = (otp) => axiosInstance.post('/auth/2fa/verify', { otp });
export const disable2FaApi = () => axiosInstance.post('/auth/2fa/disable');
export const login2FaApi = (tempToken, otp) => axiosInstance.post('/auth/login/2fa', { tempToken, otp });
