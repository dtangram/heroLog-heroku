import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import debug from 'debug';
import dotenv from 'dotenv';

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

    // Check if origin is in allowed list
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

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: ENV.nodeEnv,
    allowedOrigins: ENV.corsOrigins,
  });
});

// API routes
app.use('/collectionpublishers', collectionpublisherRouter);
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

// Utility routes
app.use('/s3', s3Router);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
    timestamp: new Date().toISOString()
  });
});

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