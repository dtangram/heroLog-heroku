import dotenv from 'dotenv';
import app from './app/index';
import db from './app/models';

// Load environment variables
dotenv.config();

// Configuration
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Database connection and server startup
const startServer = async () => {
  try {
    // Test database connection
    await db.sequelize.authenticate();
    console.log('✅ Database connection established successfully');

    // Sync only in development (use migrations in production!)
    if (NODE_ENV === 'development') {
      await db.sequelize.sync({ alter: false });
      console.log('✅ Database synchronized');
    } else {
      console.log('⚠️  Production mode: Run migrations manually with "npm run migrate"');
    }

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
      console.log(`📍 API available at http://localhost:${PORT}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`\n${signal} received. Closing server gracefully...`);
     
      server.close(async () => {
        console.log('✅ Server closed');
        try {
          await db.sequelize.close();
          console.log('✅ Database connection closed');
        } catch (error) {
          console.error('❌ Error closing database connection:', error);
        }
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

  } catch (error) {
    console.error('❌ Unable to start server:', error);
    console.error('💡 Check your database connection and environment variables');
    process.exit(1);
  }
};

startServer();

export default app;