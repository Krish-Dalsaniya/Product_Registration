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

export const updateAssignmentProgressApi = async (id, progress_percentage) => {
    return await axios.patch(`/hr/lms/assignment/${id}/progress`, { progress_percentage });
};

export const extendAssignmentDueDateApi = async (id, data) => {
    return await axios.patch(`/hr/lms/assignment/${id}/extend`, data);
};

export const deleteAssignmentApi = async (id) => {
    return await axios.delete(`/hr/lms/assignment/${id}`);
};

export const requestRetestApi = async (assignmentId) => {
    return await axios.post(`/hr/lms/assignment/${assignmentId}/request-retest`);
};

export const approveRetestApi = async (assignmentId) => {
    return await axios.post(`/hr/lms/assignment/${assignmentId}/approve-retest`);
};

export const logAssessmentApi = async (data) => {
    return await axios.post('/hr/lms/assessment', data);
};

export const getAllAssessmentsApi = async () => {
    return await axios.get('/hr/lms/assessments');
};

export const addQuizQuestionApi = async (moduleId, data) => {
    return await axios.post(`/hr/lms/module/${moduleId}/questions`, data);
};

export const getQuizQuestionsApi = async (moduleId) => {
    return await axios.get(`/hr/lms/module/${moduleId}/questions`);
};

export const deleteQuizQuestionApi = async (questionId) => {
    return await axios.delete(`/hr/lms/question/${questionId}`);
};

export const submitQuizApi = async (data) => {
    return await axios.post('/hr/lms/quiz/submit', data);
};

export const getYoutubeTitleApi = async (videoId) => {
    return await axios.get(`/hr/lms/youtube-title/${videoId}`);
};

export const generateQuizQuestionsApi = async (moduleId, transcript, count = 5) => {
    return await axios.post(`/hr/lms/module/${moduleId}/generate-questions`, { transcript, count });
};

export const addQuizQuestionsBulkApi = async (moduleId, questions) => {
    return await axios.post(`/hr/lms/module/${moduleId}/questions/bulk`, { questions });
};

export const transcribeAudioApi = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return await axios.post('/hr/lms/transcribe', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};
