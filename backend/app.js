const express = require('express');
const cors = require('cors');
const env = require('./src/config/env');
const requestLogger = require('./src/middleware/requestLogger');
const errorHandler = require('./src/middleware/errorHandler');

// Route imports
const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');
const designerRoutes = require('./src/routes/designer');
const salesRoutes = require('./src/routes/sales');
const maintenanceRoutes = require('./src/routes/maintenance');

const app = express();

// Middlewares
app.use(express.json());

// CORS normalization: remove trailing slash from frontend URL
const frontendUrl = env.FRONTEND_URL ? env.FRONTEND_URL.replace(/\/$/, "") : 'http://localhost:5173';
app.use(cors({ origin: frontendUrl, credentials: true }));

app.use(requestLogger);


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/designer', designerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/maintenance', maintenanceRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// Error handling
app.use(errorHandler);

module.exports = app;
