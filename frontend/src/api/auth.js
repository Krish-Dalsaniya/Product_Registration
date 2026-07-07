import axiosInstance from './axiosInstance';

export const loginApi = (email, password, rememberMe = false) => axiosInstance.post('/auth/login', { email, password, rememberMe });
export const refreshApi = () => axiosInstance.post('/auth/refresh');
export const logoutApi = () => axiosInstance.post('/auth/logout');
export const updateProfileImageApi = (formData) => axiosInstance.post('/auth/profile/image', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteProfileImageApi = () => axiosInstance.delete('/auth/profile/image');
export const forgotPasswordApi = (email) => axiosInstance.post('/auth/forgot-password', { email });
export const verifyEmailApi = (token) => axiosInstance.post('/auth/verify-email', { token });
export const resetPasswordApi = (resetToken, newPassword) => axiosInstance.post('/auth/reset-password', { resetToken, newPassword });
export const getMeApi = () => axiosInstance.get('/auth/me');
export const setup2FaApi = () => axiosInstance.post('/auth/2fa/setup');
export const verify2FaApi = (otp) => axiosInstance.post('/auth/2fa/verify', { otp });
export const disable2FaApi = () => axiosInstance.post('/auth/2fa/disable');
export const login2FaApi = (tempToken, otp, rememberMe = false) => axiosInstance.post('/auth/login/2fa', { tempToken, otp, rememberMe });
export const setupPasswordApi = (tempToken, newPassword) => axiosInstance.post('/auth/setup-password', { tempToken, newPassword });
export const updateProfileApi = (full_name, email) => axiosInstance.put('/auth/profile', { full_name, email });
export const changePasswordApi = (currentPassword, newPassword) => axiosInstance.put('/auth/change-password', { currentPassword, newPassword });
