import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true
});

export const getFinishedGoods = async (params) => {
    const response = await api.get('/finished-goods', { params });
    return response.data;
};

export const createFinishedGood = async (data) => {
    const response = await api.post('/finished-goods', data);
    return response.data;
};

export const getFinishedGoodsOptions = async () => {
    const response = await api.get('/finished-goods/options');
    return response.data;
};

export const deleteFinishedGood = async (id) => {
    const response = await api.delete(`/finished-goods/${id}`);
    return response.data;
};

export const updateFinishedGood = async (id, data) => {
    const response = await api.put(`/finished-goods/${id}`, data);
    return response.data;
};

export const addFinishedGoodStock = async (id, quantityToAdd) => {
    const response = await api.post(`/finished-goods/${id}/add-stock`, { quantityToAdd });
    return response.data;
};
