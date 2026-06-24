const express = require('express');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const env = require('./src/config/env');
const requestLogger = require('./src/middleware/requestLogger');
const errorHandler = require('./src/middleware/errorHandler');

// Route imports
const authRoutes = require('./src/modules/auth/auth');
const adminRoutes = require('./src/modules/admin/admin');
const designerRoutes = require('./src/modules/operations/designer');
const salesRoutes = require('./src/modules/sales/sales');
const maintenanceRoutes = require('./src/modules/operations/maintenance');
const productRoutes = require('./src/modules/inventory/products');
const categoryRoutes = require('./src/modules/inventory/categories');
const customerRoutes = require('./src/modules/sales/customers');
const companyRoutes = require('./src/modules/sales/companies');
const inventoryRoutes = require('./src/modules/inventory/inventory');
const finishedGoodsRoutes = require('./src/modules/inventory/finishedGoodsRoutes');
const bookASaleRoutes = require('./src/modules/sales/bookASaleRoutes');
const supportTicketsRoutes = require('./src/modules/communication/supportTicketsRoutes');
const chatRoutes = require('./src/modules/communication/chatRoutes');
const chatbotRoutes = require('./src/modules/communication/chatbotRoutes');
const rolesRoutes = require('./src/modules/auth/roles');
const dashboardRoutes = require('./src/modules/admin/dashboardRoutes');
const auditRoutes = require('./src/modules/operations/audit');

// Modular Routes
const hrRoutes = require('./src/modules/business/hr/routes/hrRoutes');

const app = express();
app.set('trust proxy', true); // Trust first proxy (necessary for Secure cookies behind Render/Heroku load balancers)

const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middlewares
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
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
app.use('/api/inventory', inventoryRoutes);
app.use('/api/finished-goods', finishedGoodsRoutes);
app.use('/api/book-a-sale', bookASaleRoutes);
app.use('/api/support-tickets', supportTicketsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit', auditRoutes);

// Modular Endpoints
app.use('/api/hr', hrRoutes);
app.use('/api/leaves', require('./src/modules/hr/leaves'));
app.use('/api/pms/closures', require('./src/modules/business/pms/closureRoutes'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK' }));

// Error handling
app.use((err, req, res, next) => {
  if (err.status === 400 || err.statusCode === 400) {
    console.error('--- 400 ERROR CAUGHT IN APP.JS ---', err);
  }
  next(err);
});
app.use(errorHandler);

module.exports = app;
