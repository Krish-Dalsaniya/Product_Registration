import axios from './axiosInstance';

// --- Dashboard Stats ---
export const getDashboardStatsApi = async () => {
    return await axios.get('/hr/lms/stats');
};

// --- Training Modules ---
export const createModuleApi = async (data) => {
    return await axios.post('/hr/lms/module', data);
};

export const getAllModulesApi = async () => {
    return await axios.get('/hr/lms/modules');
};

export const updateModuleApi = async (id, data) => {
    return await axios.put(`/hr/lms/module/${id}`, data);
};

export const deleteModuleApi = async (id) => {
    return await axios.delete(`/hr/lms/module/${id}`);
};

// --- Employee Training Assignments ---
export const assignTrainingApi = async (data) => {
    return await axios.post('/hr/lms/assignment', data);
};

export const getAllAssignmentsApi = async () => {
    return await axios.get('/hr/lms/assignments');
};

export const updateAssignmentStatusApi = async (id, status) => {
    return await axios.patch(`/hr/lms/assignment/${id}/status`, { status });
};
