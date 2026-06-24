import axiosInstance from './axiosInstance';

export const getProjects = () => {
  return axiosInstance.get('/admin/projects');
};

export const createProject = (data) => {
  return axiosInstance.post('/admin/projects', data);
};

export const updateProject = ({ id, data }) => {
  return axiosInstance.put(`/admin/projects/${id}`, data);
};

export const deleteProject = (id) => {
  return axiosInstance.delete(`/admin/projects/${id}`);
};
