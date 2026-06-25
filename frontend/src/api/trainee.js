import axiosInstance from './axiosInstance';

export const fetchTraineeDashboardStatsApi = () => {
    return axiosInstance.get('/hr/trainees/dashboard');
};

export const fetchTraineesApi = () => {
    return axiosInstance.get('/hr/trainees');
};

export const fetchTraineeByIdApi = (id) => {
    return axiosInstance.get(`/hr/trainees/${id}`);
};

export const createTraineeApi = (data) => {
    return axiosInstance.post('/hr/trainees', data);
};

export const updateTraineeApi = (id, data) => {
    return axiosInstance.put(`/hr/trainees/${id}`, data);
};

export const deleteTraineeApi = (id) => {
    return axiosInstance.delete(`/hr/trainees/${id}`);
};

export const convertToEmployeeApi = (id, data) => {
    return axiosInstance.post(`/hr/trainees/${id}/convert`, data);
};

export const assignLmsToTraineeApi = (id, data) => {
    return axiosInstance.post(`/hr/trainees/${id}/assign-training`, data);
};
