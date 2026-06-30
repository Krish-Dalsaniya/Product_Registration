import api from './axiosInstance';

export const fetchLeaveSummaryApi = () => api.get('/leaves/summary');
export const fetchUpcomingLeavesApi = () => api.get('/leaves/upcoming');
export const fetchCalendarDataApi = (month, year) => api.get(`/leaves/calendar?month=${month}&year=${year}`);
export const fetchUserLeaveBalancesApi = () => api.get('/leaves/balances');
export const applyForLeaveApi = (data) => api.post('/leaves/apply', data);
export const fetchAllLeaveRequestsApi = () => api.get('/leaves/requests/all');
export const updateLeaveStatusApi = (id, status) => api.put(`/leaves/requests/${id}/status`, { status });
export const fetchEmployeeLeavesApi = (id) => api.get(`/leaves/employee/${id}`);
export const fetchMyLeaveHistoryApi = () => api.get('/leaves/my-history');
