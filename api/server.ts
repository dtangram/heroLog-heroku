import path from 'path';
import dotenv from 'dotenv';
import app from './app/index';

// Load environment variables
dotenv.config();

// Configuration
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Serve static files from React app in production
if (NODE_ENV === 'production') {
  const express = require('express');
  app.use(express.static(path.join(__dirname, '../reactjs/build')));
  
  // Handle React routing - return all requests to React app
  app.get('*', (_req: any, res: any) => {
    res.sendFile(path.join(__dirname, '../reactjs/build', 'index.html'));
  });
}

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
  console.log(`📍 API available at http://localhost:${PORT}`);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Closing server gracefully...`);
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;