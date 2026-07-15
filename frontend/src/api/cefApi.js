import axiosInstance from './axiosInstance';

const BASE_URL = '/hr/cef-forms';

export const getForms = async () => {
  const response = await axiosInstance.get(BASE_URL);
  return response.data;
};

export const getFormSchema = async (id) => {
  const response = await axiosInstance.get(`/hr/enterprise-forms/${id}/schema`);
  return response.data;
};

export const uploadForm = async (formData) => {
  const response = await axiosInstance.post(BASE_URL, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const createDynamicForm = async (data) => {
  const response = await axiosInstance.post('/hr/enterprise-forms', data);
  return response.data;
};

export const updateForm = async (id, formData) => {
  const response = await axiosInstance.put(`${BASE_URL}/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateDynamicForm = async (id, data) => {
  const isUUID = isNaN(id);
  const endpoint = isUUID ? `/hr/enterprise-forms/${id}` : `${BASE_URL}/${id}`;
  const response = await axiosInstance.put(endpoint, data);
  return response.data;
};

export const deleteForm = async (id) => {
  const response = await axiosInstance.delete(`${BASE_URL}/${id}`);
  return response.data;
};

export const publishForm = async (id, is_public) => {
  const response = await axiosInstance.put(`/hr/enterprise-forms/${id}/publish`, { is_public });
  return response.data;
};

export const getFormResponses = async (id) => {
  const response = await axiosInstance.get(`/hr/enterprise-forms/${id}/responses`);
  return response.data;
};
