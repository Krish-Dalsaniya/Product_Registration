import axiosInstance from './axiosInstance';

export const getClosures = (params) => axiosInstance.get('/pms/closures', { params });
export const getClosureById = (id) => axiosInstance.get(`/pms/closures/${id}`);
export const createClosure = (data) => axiosInstance.post('/pms/closures', data);
export const updateClosure = (id, data) => axiosInstance.put(`/pms/closures/${id}`, data);
export const deleteClosure = (id) => axiosInstance.delete(`/pms/closures/${id}`);
export const getClosureMetrics = () => axiosInstance.get('/pms/closures/metrics');

export const getProjects = (params) => axiosInstance.get('/pms/projects', { params });
export const getProjectById = (id) => axiosInstance.get(`/pms/projects/${id}`);
export const createProject = (data) => axiosInstance.post('/pms/projects', data);
export const updateProject = (id, data) => axiosInstance.put(`/pms/projects/${id}`, data);
export const deleteProject = (id) => axiosInstance.delete(`/pms/projects/${id}`);
export const getProjectMetrics = () => axiosInstance.get('/pms/projects/metrics');
export const getPortfolioMetrics = () => axiosInstance.get('/pms/projects/portfolio/metrics');

// Task APIs
export const getTasks = (params) => axiosInstance.get('/pms/tasks', { params });
export const getTaskById = (id) => axiosInstance.get(`/pms/tasks/${id}`);
export const createTask = (data) => axiosInstance.post('/pms/tasks', data);
export const updateTask = (id, data) => axiosInstance.put(`/pms/tasks/${id}`, data);
export const deleteTask = (id) => axiosInstance.delete(`/pms/tasks/${id}`);
export const updateTaskStatus = (id, status) => axiosInstance.put(`/pms/tasks/${id}/status`, { status });
export const getTaskMetrics = () => axiosInstance.get('/pms/tasks/metrics');
export const getTaskComments = (id) => axiosInstance.get(`/pms/tasks/${id}/comments`);
export const addTaskComment = (id, data) => axiosInstance.post(`/pms/tasks/${id}/comments`, data);
export const getTaskTimeLogs = (id) => axiosInstance.get(`/pms/tasks/${id}/time-logs`);
export const addTaskTimeLog = (id, data) => axiosInstance.post(`/pms/tasks/${id}/time-logs`, data);
export const getTaskActivityLogs = (id) => axiosInstance.get(`/pms/tasks/${id}/activity`);

// Sprint APIs
export const getProjectSprints = (params) => axiosInstance.get('/pms/sprints', { params });
export const getSprintById = (id) => axiosInstance.get(`/pms/sprints/${id}`);
export const createSprint = (data) => axiosInstance.post('/pms/sprints', data);
export const updateSprint = (id, data) => axiosInstance.put(`/pms/sprints/${id}`, data);
export const deleteSprint = (id) => axiosInstance.delete(`/pms/sprints/${id}`);
export const getSprintMetrics = (id) => axiosInstance.get(`/pms/sprints/${id}/metrics`);

// Epic APIs
export const getProjectEpics = (params) => axiosInstance.get('/pms/epics', { params });
export const createEpic = (data) => axiosInstance.post('/pms/epics', data);
export const updateEpic = (id, data) => axiosInstance.put(`/pms/epics/${id}`, data);
export const deleteEpic = (id) => axiosInstance.delete(`/pms/epics/${id}`);

export const getTaskSubtasks = (id) => axiosInstance.get(`/pms/tasks/${id}/subtasks`);
