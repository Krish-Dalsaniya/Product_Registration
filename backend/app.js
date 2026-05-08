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
const customerRoutes = require('./src/routes/customers');
const featureMappingRoutes = require('./src/routes/featureMappingRoutes');
const companyRoutes = require('./src/routes/companies');
const inventoryRoutes = require('./src/routes/inventory');

const app = express();

const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middlewares
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDir, {
  setHeaders: (res, path) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    
    // Ensure files are viewed inline rather than downloaded automatically
    const lowerPath = path.toLowerCase();
    if (lowerPath.endsWith('.pdf') || lowerPath.endsWith('_pdf')) {
      res.set('Content-Type', 'application/pdf');
      res.set('Content-Disposition', 'inline');
    } else if (lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg') || lowerPath.endsWith('.png')) {
      res.set('Content-Disposition', 'inline');
    }
  }
}));

// CORS: Reverted to yesterday's style + hardcoded fallback for Netlify
const origins = [
  env.FRONTEND_URL ? env.FRONTEND_URL.replace(/\/$/, "") : 'https://productsregistration.netlify.app',
  env.FRONTEND_URL ? (env.FRONTEND_URL.endsWith('/') ? env.FRONTEND_URL : `${env.FRONTEND_URL}/`) : 'https://productsregistration.netlify.app/',
  'https://productsregistration.netlify.app',
  'https://productsregistration.netlify.app/'
];

app.use(cors({ 
  origin: function (origin, callback) {
    if (!origin || origins.indexOf(origin) !== -1 || (env.NODE_ENV !== 'production' && origin.includes('localhost'))) {
      callback(null, true);
    } else {
      console.error(`CORS Reject: ${origin}. Allowed: ${origins}`);
      callback(new Error('Not allowed by CORS'));
    }
  }, 
  credentials: true 
}));


app.use(requestLogger);


// Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/designer', designerRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/feature-mappings', featureMappingRoutes);
app.use('/api/inventory', inventoryRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// Error handling
app.use(errorHandler);

module.exports = app;
