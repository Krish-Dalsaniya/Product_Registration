import axios from 'axios';
import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

// Patch toast.error to allow silent failures for globally handled errors (like 403)
const originalToastError = toast.error;
toast.error = (msg, ...args) => {
  if (msg === 'SILENT_ERROR') return;
  return originalToastError(msg, ...args);
};

const rawBaseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const baseURL = rawBaseURL.endsWith('/api') ? rawBaseURL : `${rawBaseURL.replace(/\/$/, '')}/api`;

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login' && originalRequest.url !== '/auth/refresh') {
      
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          return axiosInstance(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        await axios.post(`${axiosInstance.defaults.baseURL}/auth/refresh`, {}, { withCredentials: true });
        processQueue(null, 'refreshed');
        return await axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (refreshError.response && (refreshError.response.status === 401 || refreshError.response.status === 400)) {
          localStorage.removeItem('user');
          window.dispatchEvent(new Event('unauthorized'));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    // Global handling for 403 Forbidden (Permission Denied)
    if (error.response?.status === 403) {
      const method = originalRequest.method?.toUpperCase();
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        Swal.fire({
          title: 'Permission Denied',
          text: "You don't have permission for this action.",
          icon: 'error',
          confirmButtonColor: '#ef4444'
        });
      }
      // Return a special error that the patched toast.error will ignore
      const customError = {
        message: 'SILENT_ERROR',
        code: 'FORBIDDEN',
        status: 403,
        isNetworkError: false,
        response: { data: { error: { message: 'SILENT_ERROR' } } }
      };
      return Promise.reject(customError);
    }

    // Transform error for easier UI consumption, but preserve response for components that check error.response
    const customError = {
      message: error.response?.data?.error?.message || error.message || 'An unexpected error occurred',
      code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
      status: error.response?.status,
      isNetworkError: !error.response,
      response: error.response
    };
    
    return Promise.reject(customError);
  }
);

export default axiosInstance;
