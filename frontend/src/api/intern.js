import axiosInstance from './axiosInstance';

export const fetchInternDashboardStatsApi = () => {
    return axiosInstance.get('/hr/interns/dashboard');
};

export const fetchInternsApi = () => {
    return axiosInstance.get('/hr/interns');
};

export const fetchInternByIdApi = (id) => {
    return axiosInstance.get(`/hr/interns/${id}`);
};

export const createInternApi = (data) => {
    return axiosInstance.post('/hr/interns', data);
};

export const updateInternApi = (id, data) => {
    return axiosInstance.put(`/hr/interns/${id}`, data);
};

export const deleteInternApi = (id) => {
    return axiosInstance.delete(`/hr/interns/${id}`);
};

export const convertToEmployeeApi = (id, data) => {
    return axiosInstance.post(`/hr/interns/${id}/convert`, data);
};

export const assignLmsToInternApi = (id, data) => {
    return axiosInstance.post(`/hr/interns/${id}/assign-training`, data);
};


export const convertInternToTraineeApi = (id) => {
    return axiosInstance.post(`/hr/interns/${id}/convert-to-trainee`);
};
