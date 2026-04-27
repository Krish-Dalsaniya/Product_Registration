const morgan = require('morgan');

const requestLogger = morgan('dev');

module.exports = requestLogger;
