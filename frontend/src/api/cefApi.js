import axiosInstance from './axiosInstance';

const BASE_URL = '/hr/cef-forms';

export const getForms = async () => {
  const response = await axiosInstance.get(BASE_URL);
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
  const response = await axiosInstance.post(BASE_URL, data);
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
  const response = await axiosInstance.put(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deleteForm = async (id) => {
  const response = await axiosInstance.delete(`${BASE_URL}/${id}`);
  return response.data;
};
