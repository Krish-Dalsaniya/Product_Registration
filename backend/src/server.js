const app = require('../app');
const env = require('./config/env');
const migrate = require('../migrate_categories');

const PORT = env.PORT || 3000;

const startServer = async () => {
  try {
    console.log('--- PRODUCTION SYNC: RUNNING MIGRATIONS ---');
    await migrate();
    console.log('--- PRODUCTION SYNC: SUCCESS ---');
    
    app.listen(PORT, () => {
      console.log(`Server is running in ${env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('--- PRODUCTION SYNC: FAILED ---');
    console.error(error);
    // Even if migration fails (e.g. columns already exist), we still try to start
    app.listen(PORT, () => {
      console.log(`Server is running in ${env.NODE_ENV} mode on port ${PORT}`);
    });
  }
};

startServer();
