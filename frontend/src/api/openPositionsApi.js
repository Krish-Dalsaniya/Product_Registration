import axiosInstance from './axiosInstance';

const BASE_URL = '/hr/open-positions';

export const getPositions = async () => {
  const response = await axiosInstance.get(BASE_URL);
  return response.data;
};

export const createPosition = async (data) => {
  const response = await axiosInstance.post(BASE_URL, data);
  return response.data;
};

export const updatePosition = async (id, data) => {
  const response = await axiosInstance.put(`${BASE_URL}/${id}`, data);
  return response.data;
};

export const deletePosition = async (id) => {
  const response = await axiosInstance.delete(`${BASE_URL}/${id}`);
  return response.data;
};
