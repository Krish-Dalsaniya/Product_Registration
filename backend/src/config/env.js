require('dotenv').config();

// Support multiple frontend origins via FRONTEND_URLS (comma-separated).
// Fallback to FRONTEND_URL for single-value compatibility.
const frontendUrlsEnv = process.env.FRONTEND_URLS;
const frontendUrls = frontendUrlsEnv
  ? frontendUrlsEnv.split(',').map(s => s.trim()).filter(Boolean)
  : (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : ['http://localhost:5173']);

const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_here',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret_here',
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URLS: frontendUrls,
  // keep FRONTEND_URL for backward compatibility (first entry)
  FRONTEND_URL: frontendUrls[0]
};

// Simple validation
Object.entries(env).forEach(([key, value]) => {
  if (!value && key === 'DATABASE_URL') {
    console.warn(`Warning: Environment variable ${key} is not set.`);
  }
});

module.exports = env;
