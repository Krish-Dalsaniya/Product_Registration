const app = require('../app');
const env = require('./config/env');

const PORT = env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running in ${env.NODE_ENV} mode on port ${PORT}`);
});
