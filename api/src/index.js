const app = require('./app');
const config = require('./config');

const server = app.listen(config.port, () => {
  console.log(`ICA Backend API listening on port ${config.port} in ${config.nodeEnv} mode`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});