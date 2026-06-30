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

export const fetchEmployeeHierarchyApi = () => api.get('/hr/employees/hierarchy');
export const updateHREmployeeApi = (id, data) => api.put(`/hr/employees/${id}`, data);
export const deleteHREmployeeApi = (id) => api.delete(`/hr/employees/${id}`);
export const updateHREmployeeRoleApi = (id, role_id) => api.put(`/hr/employees/${id}/role`, { role_id });

export const fetchHolidaysApi = async (year) => {
  return await api.get('/hr/holidays', { params: { year } });
};
export const createHolidayApi = async (data) => {
  return await api.post('/hr/holidays', data);
};
export const deleteHolidayApi = async (id) => {
  return await api.delete(`/hr/holidays/${id}`);
};
export const updateHolidayApi = async (id, data) => {
  return await api.put(`/hr/holidays/${id}`, data);
};

// Onboarding
export const fetchOnboardingRecordsApi = () => api.get('/hr/onboarding');
export const createOnboardingRecordApi = (data) => api.post('/hr/onboarding', data);
export const updateOnboardingStatusApi = (id, status) => api.patch(`/hr/onboarding/${id}/status`, { status });
export const updateOnboardingChecklistApi = (id, data) => api.patch(`/hr/onboarding/${id}/checklist`, data);
export const extractOnboardingZipApi = (formData) => api.post('/hr/onboarding/extract-zip', formData);

// Trainees
export const fetchTraineesApi = () => api.get('/hr/trainees');
export const assignTrainingToTraineeApi = (id, data) => api.post(`/hr/trainees/${id}/assign-training`, data);

// Offboarding
export const fetchOffboardingRecordsApi = () => api.get('/hr/offboarding');
export const createOffboardingRecordApi = (data) => api.post('/hr/offboarding', data);
export const updateOffboardingStatusApi = (id, status) => api.patch(`/hr/offboarding/${id}/status`, { status });
export const updateOffboardingChecklistApi = (id, data) => api.patch(`/hr/offboarding/${id}/checklist`, data);

// Registrations
export const registerEmployeeApi = (data) => api.post('/hr/employees/register', data);
export const fetchPendingRegistrationsApi = () => api.get('/hr/employees/pending-registrations');
export const approveRegistrationApi = (id) => api.post(`/hr/employees/pending-registrations/${id}/approve`);
export const rejectRegistrationApi = (id) => api.post(`/hr/employees/pending-registrations/${id}/reject`);

// Claims
export const fetchClaimsApi = () => api.get('/hr/claims');
export const createClaimApi = (data) => api.post('/hr/claims', data);
export const updateClaimStatusApi = (id, data) => api.put(`/hr/claims/${id}/status`, data);

// Advances
export const fetchAdvancesApi = () => api.get('/hr/advances');
export const createAdvanceApi = (data) => api.post('/hr/advances', data);
export const updateAdvanceStatusApi = (id, data) => api.put(`/hr/advances/${id}/status`, data);
