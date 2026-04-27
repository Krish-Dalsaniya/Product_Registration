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
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
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
