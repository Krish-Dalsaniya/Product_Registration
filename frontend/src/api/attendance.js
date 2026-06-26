import api from './axiosInstance';

export const fetchAttendanceRecordsApi = (params) => {
  return api.get('/hr/attendance', { params });
};

export const fetchAttendanceMetricsApi = () => {
  return api.get('/hr/attendance/metrics');
};

export const createManualAttendanceApi = (data) => {
  return api.post('/hr/attendance', data);
};

export const updateAttendanceApi = (id, data) => {
  return api.put(`/hr/attendance/${id}`, data);
};

export const clockInApi = (data) => {
  return api.post('/hr/attendance/clock-in', data);
};

export const clockOutApi = (data) => {
  return api.post('/hr/attendance/clock-out', data);
};

export const fetchAttendanceMusterApi = (params) => {
  return api.get('/hr/attendance/muster', { params });
};

export const generateVerificationTokenApi = (data) => {
  return api.post('/hr/attendance/verification-token', data);
};
