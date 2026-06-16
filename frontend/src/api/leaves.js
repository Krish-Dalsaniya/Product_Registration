import api from './axiosInstance';

export const fetchLeaveSummaryApi = () => api.get('/leaves/summary');
export const fetchUpcomingLeavesApi = () => api.get('/leaves/upcoming');
export const fetchCalendarDataApi = (month, year) => api.get(`/leaves/calendar?month=${month}&year=${year}`);
export const applyForLeaveApi = (data) => api.post('/leaves/apply', data);
export const fetchAllPendingRequestsApi = () => api.get('/leaves/requests/pending');
export const updateLeaveStatusApi = (id, status) => api.put(`/leaves/requests/${id}/status`, { status });
