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
export const deletePCBFile = (id, field) => axiosInstance.delete(`/inventory/pcb/${id}/file`, { data: { field } });
export const addPCBStock = (id, quantityToAdd) => axiosInstance.post(`/inventory/pcb/${id}/add-stock`, { quantityToAdd });

export const getNotifications = () => axiosInstance.get('/dashboard/notifications');

export const getElectronicsParts = (params) => axiosInstance.get('/inventory/electronics', { params });
export const getElectronicsPartById = (id) => axiosInstance.get(`/inventory/electronics/${id}`);
export const createElectronicsPart = (formData) => axiosInstance.post('/inventory/electronics', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const updateElectronicsPart = (id, formData) => axiosInstance.put(`/inventory/electronics/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteElectronicsPart = (id) => axiosInstance.delete(`/inventory/electronics/${id}`);
export const deleteElectronicsImage = (id, image_url) => axiosInstance.delete(`/inventory/electronics/${id}/image`, { data: { image_url } });
export const deleteElectronicsFile = (id, field) => axiosInstance.delete(`/inventory/electronics/${id}/file`, { data: { field } });
export const addElectronicsStock = (id, quantityToAdd) => axiosInstance.post(`/inventory/electronics/${id}/add-stock`, { quantityToAdd });

export const getElectricalParts = (params) => axiosInstance.get('/inventory/electrical', { params });
export const getElectricalPartById = (id) => axiosInstance.get(`/inventory/electrical/${id}`);
export const createElectricalPart = (formData) => axiosInstance.post('/inventory/electrical', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const updateElectricalPart = (id, formData) => axiosInstance.put(`/inventory/electrical/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteElectricalPart = (id) => axiosInstance.delete(`/inventory/electrical/${id}`);
export const deleteElectricalImage = (id, imageUrl) => axiosInstance.delete(`/inventory/electrical/${id}/image`, { data: { imageUrl } });
export const deleteElectricalFile = (id, field) => axiosInstance.delete(`/inventory/electrical/${id}/file`, { data: { field } });
export const addElectricalStock = (id, quantityToAdd) => axiosInstance.post(`/inventory/electrical/${id}/add-stock`, { quantityToAdd });

export const getStructuralParts = (params) => axiosInstance.get('/inventory/structural', { params });
export const getStructuralPartById = (id) => axiosInstance.get(`/inventory/structural/${id}`);
export const createStructuralPart = (formData) => axiosInstance.post('/inventory/structural', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const updateStructuralPart = (id, formData) => axiosInstance.put(`/inventory/structural/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteStructuralPart = (id) => axiosInstance.delete(`/inventory/structural/${id}`);
export const deleteStructuralImage = (id, imageUrl) => axiosInstance.delete(`/inventory/structural/${id}/image`, { data: { imageUrl } });
export const deleteStructuralFile = (id, field) => axiosInstance.delete(`/inventory/structural/${id}/file`, { data: { field } });
export const addStructuralStock = (id, quantityToAdd) => axiosInstance.post(`/inventory/structural/${id}/add-stock`, { quantityToAdd });
