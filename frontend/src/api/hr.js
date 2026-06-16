import api from './axiosInstance';

export const fetchHRDashboardMetricsApi = async () => {
  return await api.get('/hr/dashboard/metrics');
};

export const fetchHREmployeesApi = async () => {
  return await api.get('/hr/employees');
};

export const fetchHRMetadataApi = async () => {
  return await api.get('/hr/metadata');
};

export const createHREmployeeApi = async (data) => {
  return await api.post('/hr/employees', data);
};

export const fetchHREmployeeByIdApi = async (id) => {
  return await api.get(`/hr/employees/${id}`);
};

export const updateHREmployeeApi = (id, data) => api.put(`/hr/employees/${id}`, data);
export const deleteHREmployeeApi = (id) => api.delete(`/hr/employees/${id}`);
export const updateHREmployeeRoleApi = (id, role_id) => api.put(`/hr/employees/${id}/role`, { role_id });
