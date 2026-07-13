const axios = require('axios');
const env = require('../config/env');

const gitEngineClient = axios.create({
    baseURL: env.GIT_ENGINE_URL,
    timeout: 15000,
});

// Request interceptor to add the Bearer token
gitEngineClient.interceptors.request.use((config) => {
    if (env.GIT_ENGINE_API_KEY) {
        config.headers['Authorization'] = `Bearer ${env.GIT_ENGINE_API_KEY}`;
    }
    // Required to bypass Ngrok's free tier browser warning screen
    config.headers['ngrok-skip-browser-warning'] = '1';
    return config;
}, (error) => {
    return Promise.reject(error);
});

module.exports = gitEngineClient;
