import axiosInstance from './axiosInstance';

export const getFeatureMappings = async () => {
  const response = await axiosInstance.get('/feature-mappings');
  return response.data.data;
};

export const createFeatureMapping = async (data) => {
  const response = await axiosInstance.post('/feature-mappings', data);
  return response.data.data;
};

export const updateFeatureMapping = async (id, data) => {
  const response = await axiosInstance.put(`/feature-mappings/${id}`, data);
  return response.data.data;
};

export const deleteFeatureMapping = async (id) => {
  const response = await axiosInstance.delete(`/feature-mappings/${id}`);
  return response.data.data;
};
