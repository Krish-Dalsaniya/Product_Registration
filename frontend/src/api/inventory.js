import axiosInstance from './axiosInstance';

export const getPCBs = (params) => axiosInstance.get('/inventory/pcb', { params });
export const getPCBById = (id) => axiosInstance.get(`/inventory/pcb/${id}`);
export const createPCB = (formData) => axiosInstance.post('/inventory/pcb', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const updatePCB = (id, formData) => axiosInstance.put(`/inventory/pcb/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const deletePCB = (id) => axiosInstance.delete(`/inventory/pcb/${id}`);
export const deletePCBImage = (id, imageUrl) => axiosInstance.delete(`/inventory/pcb/${id}/image`, { data: { imageUrl } });

export const getElectronicsParts = (params) => axiosInstance.get('/inventory/electronics', { params });
export const getElectronicsPartById = (id) => axiosInstance.get(`/inventory/electronics/${id}`);
export const createElectronicsPart = (formData) => axiosInstance.post('/inventory/electronics', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const updateElectronicsPart = (id, formData) => axiosInstance.put(`/inventory/electronics/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteElectronicsPart = (id) => axiosInstance.delete(`/inventory/electronics/${id}`);
