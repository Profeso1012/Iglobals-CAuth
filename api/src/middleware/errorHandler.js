const config = require('../config');

function errorHandler(err, req, res, next) {
  if (config.nodeEnv === 'development') {
    console.error('[Global Error Handler]', err);
  } else {
    // In production, log to backend only for debugging
    console.error('[Error]', err.message);
  }

  const status = err.status || 500;
  res.status(status).json({
    error: err.code || 'internal_server_error',
    error_description: config.nodeEnv === 'development' ? err.message : 'An unexpected error occurred.',
    status,
  });
}

module.exports = errorHandler;
