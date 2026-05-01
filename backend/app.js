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

// CORS: in development, allow all localhost and tunnel domains; in production, validate against whitelist
const isDev = env.NODE_ENV !== 'production';
const configuredFrontends = (env.FRONTEND_URLS || []).map(u => u.replace(/\/$/, ""));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/$/, "");
    
    // if explicitly configured, always allow (fastest check)
    if (configuredFrontends.length && configuredFrontends.indexOf(normalizedOrigin) !== -1) {
      return callback(null, true);
    }
    
    // in development, allow any localhost and known tunnel domains
    if (isDev) {
      try {
        const host = new URL(origin).hostname;
        // allow localhost / 127.0.0.1 (any port)
        if (host === 'localhost' || host === '127.0.0.1') return callback(null, true);
        // allow tunnel domains commonly used for port forwarding (dev tunnels, ngrok, cloudflare)
        if (host.endsWith('devtunnels.ms') || host.endsWith('ngrok.io') || host.endsWith('trycloudflare.com')) {
          return callback(null, true);
        }
      } catch (e) {
        // fall through to rejection
      }
    }
    
    callback(new Error('Not allowed by CORS'));
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
