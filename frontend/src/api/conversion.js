import axiosInstance from './axiosInstance';

export const fetchPendingConversionsApi = () => {
    return axiosInstance.get('/hr/conversions/pending');
};

export const approveConversionApi = (id) => {
    return axiosInstance.post(`/hr/conversions/${id}/approve`);
};

export const rejectConversionApi = (id) => {
    return axiosInstance.post(`/hr/conversions/${id}/reject`);
};

export const fetchCertificateApi = (type, id) => {
    return axiosInstance.get(`/hr/conversions/certificate/${type}/${id}`);
};
