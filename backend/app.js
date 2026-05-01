const express = require('express');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const env = require('./src/config/env');
const requestLogger = require('./src/middleware/requestLogger');
const errorHandler = require('./src/middleware/errorHandler');

// Route imports
const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');
const designerRoutes = require('./src/routes/designer');
const salesRoutes = require('./src/routes/sales');
const maintenanceRoutes = require('./src/routes/maintenance');
const productRoutes = require('./src/routes/products');
const categoryRoutes = require('./src/routes/categories');

const app = express();

// Middlewares
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// CORS: Support multiple origins from FRONTEND_URLS env var
const isDev = env.NODE_ENV !== 'production';
const allowedOrigins = [...(env.FRONTEND_URLS || [])];

console.log('CORS Initialized with Allowed Origins:', allowedOrigins);

// In development, also allow localhost and common tunnels
if (isDev) {
  allowedOrigins.push(/localhost(:\d+)?$/);
  allowedOrigins.push(/127\.0\.0\.1(:\d+)?$/);
  allowedOrigins.push(/\.devtunnels\.ms$/);
  allowedOrigins.push(/\.ngrok\.io$/);
  allowedOrigins.push(/\.trycloudflare\.com$/);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    const normalizedOrigin = origin.trim().replace(/\/$/, "");
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      const normalizedAllowed = allowed.trim().replace(/\/$/, "");
      
      // Strict match
      if (normalizedAllowed === normalizedOrigin) return true;
      
      // Fuzzy match (ignore https/http differences and check if one contains the other)
      const pureAllowed = normalizedAllowed.replace(/^https?:\/\//, "");
      const pureOrigin = normalizedOrigin.replace(/^https?:\/\//, "");
      return pureAllowed === pureOrigin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.error(`[CORS REJECTED] Origin: "${origin}" | Allowed: ${JSON.stringify(allowedOrigins)}`);
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true
}));


app.use(requestLogger);


// Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/designer', designerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/products', productRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// Error handling
app.use(errorHandler);

module.exports = app;
