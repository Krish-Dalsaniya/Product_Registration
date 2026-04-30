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

// CORS normalization: handle both trailing slash and non-trailing slash
const origins = [
  env.FRONTEND_URL ? env.FRONTEND_URL.replace(/\/$/, "") : 'http://localhost:5173',
  env.FRONTEND_URL ? (env.FRONTEND_URL.endsWith('/') ? env.FRONTEND_URL : `${env.FRONTEND_URL}/`) : 'http://localhost:5173/'
];
app.use(cors({ 
  origin: function (origin, callback) {
    if (!origin || origins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
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
