import axiosInstance from './axiosInstance';

export const getCustomers = async () => {
  const response = await axiosInstance.get('/customers');
  return response.data.data;
};

export const getCustomerById = async (id) => {
  const response = await axiosInstance.get(`/customers/${id}`);
  return response.data.data;
};

export const createCustomer = async (customerData) => {
  const response = await axiosInstance.post('/customers', customerData);
  return response.data.data;
};

export const updateCustomer = async (id, customerData) => {
  const response = await axiosInstance.put(`/customers/${id}`, customerData);
  return response.data.data;
};

export const deleteCustomer = async (id) => {
  const response = await axiosInstance.delete(`/customers/${id}`);
  return response.data.data;
};
