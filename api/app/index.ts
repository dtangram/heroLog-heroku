import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import debug from 'debug';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import db from './models'; // Import db for health check

// Import routers
import collectionpublisherRouter from './routes/collectionpublishers';
import comicbooktitleRouter from './routes/comicbooktitles';
import comicbookRouter from './routes/comicbook';
import messagingRouter from './routes/messaging';
import salelistRouter from './routes/salelist';
import salelistALLRouter from './routes/salelistALL';
import wishlistRouter from './routes/wishlist';
import usersRouter from './routes/user';
import authRouter from './routes/auth';
import passwordresetRouter from './routes/passwordreset';
import emailPasswordResetRouter from './routes/emailpasswordreset';

// Import utility routes
import s3Router from './routes/s3upload';
import aiScanner from './routes/aiScanner';
import collectionInsights from './routes/collectionInsights';

// ============================================================================
// CONFIGURATION
// ============================================================================

// Load environment variables
dotenv.config();

const log = debug('api:server');
const errorLog = debug('api:error');

const ENV = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 4000,
  // Support multiple origins separated by comma
  corsOrigins: process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:3001'],
};

// ============================================================================
// APP SETUP
// ============================================================================

const app: Express = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

// CORS configuration with multiple origins support
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // In production, allow same-origin requests (your Heroku domain)
    if (ENV.nodeEnv === 'production') {
      return callback(null, true);  // Allow all origins in production
    }

    // In development, check allowed list
    if (ENV.corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      errorLog(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Body parsing middleware (built into Express 4.16+)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
if (ENV.nodeEnv === 'development') {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    log(`${req.method} ${req.url} - Origin: ${req.headers.origin || 'none'}`);
    next();
  });
}

// Global request logger (for debugging)
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`📨 ${req.method} ${req.url}`);
  console.log(`📨 Body:`, JSON.stringify(req.body));
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint with database status
app.get('/health', async (_req: Request, res: Response) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: ENV.nodeEnv,
    allowedOrigins: ENV.corsOrigins,
    database: {
      status: 'unknown',
      message: ''
    }
  };

  try {
    // Test database connection
    await db.sequelize.authenticate();
    healthCheck.database.status = 'connected';
    healthCheck.database.message = 'Database connection is healthy';
    res.status(200).json(healthCheck);
  } catch (error) {
    healthCheck.status = 'degraded';
    healthCheck.database.status = 'disconnected';
    healthCheck.database.message = 'Database connection failed';
    errorLog('Database health check failed:', error);
    res.status(503).json(healthCheck);
  }
});

// API routes
app.use('/collectpub', collectionpublisherRouter);
app.use('/comicbooktitles', comicbooktitleRouter);
app.use('/comicbook', comicbookRouter);
app.use('/messaging', messagingRouter);
app.use('/salelist', salelistRouter);
app.use('/salelistALL', salelistALLRouter);
app.use('/wishlist', wishlistRouter);
app.use('/users', usersRouter);
app.use('/auth', authRouter);
app.use('/passwordreset', passwordresetRouter);
app.use('/emailpasswordreset', emailPasswordResetRouter);
app.use('/ai', aiScanner);
app.use('/api/insights', collectionInsights);

// Utility routes
app.use('/s3', s3Router);

// ============================================================================
// SERVE REACT APP (Production only)
// ============================================================================

if (ENV.nodeEnv === 'production') {
  // Try multiple possible build locations
  const possibleBuildPaths = [
    path.join(__dirname, '../build'),            // api/dist/build (expected location)
    path.join(__dirname, '../../reactjs/build'), // reactjs/build (fallback)
    path.join(__dirname, 'build'),               // api/dist/app/build (alternative)
  ];
  
  console.log('🔍 Searching for React build...');
  console.log('📁 Current directory (__dirname):', __dirname);
  console.log('🔎 Checking paths:', possibleBuildPaths);
  
  const reactBuildPath = possibleBuildPaths.find(buildPath => {
    const exists = fs.existsSync(buildPath);
    console.log(`  ${exists ? '✅' : '❌'} ${buildPath}`);
    return exists;
  });
  
  if (reactBuildPath) {
    console.log('✅ Serving React build from:', reactBuildPath);
    
    // Serve static files from React build
    app.use(express.static(reactBuildPath));
    
    // Catch-all route to serve React's index.html for client-side routing
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(reactBuildPath, 'index.html'));
    });
  } else {
    console.error('❌ React build folder not found!');
    console.error('📂 Tried the following locations:');
    possibleBuildPaths.forEach(p => console.error(`   - ${p}`));
    
    // Try to list what's actually available
    try {
      const distContents = fs.readdirSync(path.join(__dirname, '..'));
      console.log('📂 Contents of dist folder:', distContents);
    } catch (err) {
      console.error('❌ Could not read dist folder:', err);
    }
    
    // Fallback error page
    app.get('*', (_req: Request, res: Response) => {
      res.status(500).json({
        error: 'Configuration Error',
        message: 'React build not found. Please check deployment configuration.',
        timestamp: new Date().toISOString(),
        checkedPaths: possibleBuildPaths
      });
    });
  }
}

// ============================================================================
// ERROR HANDLING (Development only - production uses React catch-all)
// ============================================================================

if (ENV.nodeEnv !== 'production') {
  // 404 handler (only for development)
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.url}`,
      timestamp: new Date().toISOString()
    });
  });
}

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  errorLog('ERROR:', err.message);
  errorLog('Stack:', err.stack);

  // Don't leak error details in production
  const errorResponse = {
    error: 'Internal Server Error',
    message: ENV.nodeEnv === 'development' ? err.message : 'An error occurred',
    timestamp: new Date().toISOString(),
    ...(ENV.nodeEnv === 'development' && { stack: err.stack })
  };

  res.status(500).json(errorResponse);
});

// ============================================================================
// EXPORTS
// ============================================================================

export default app;