import axiosInstance from './axiosInstance';

export const getSupportTickets = async () => {
    return axiosInstance.get('/support-tickets');
};

export const getSupportTicketById = async (id) => {
    return axiosInstance.get(`/support-tickets/${id}`);
};

export const createSupportTicket = async (formData) => {
    return axiosInstance.post('/support-tickets', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export const updateSupportTicket = async (id, formData) => {
    return axiosInstance.put(`/support-tickets/${id}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export const deleteSupportTicket = async (id) => {
    return axiosInstance.delete(`/support-tickets/${id}`);
};

// --- Messages ---
export const getSupportTicketMessages = async (id) => {
    return axiosInstance.get(`/support-tickets/${id}/messages`);
};

export const addSupportTicketMessage = async (id, message) => {
    return axiosInstance.post(`/support-tickets/${id}/messages`, { message });
};

export const deleteSupportTicketMessage = async (id, messageId) => {
    return axiosInstance.delete(`/support-tickets/${id}/messages/${messageId}`);
};
