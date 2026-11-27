import express, { Express, Request, Response, NextFunction, Router } from 'express';
import cors from 'cors';
import debug from 'debug';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import db from './models';
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
import searchRouter from './routes/search';
import s3Router from './routes/s3upload';
import aiScanner from './routes/aiScanner';
import collectionInsights from './routes/collectionInsights';
import { servePageLoads } from './middleware/pageLoads';
import { API_PREFIX, LEGACY_ROOT_ROUTES } from './apiRoutes';

// Load environment variables
dotenv.config();

const log = debug('api:server');
const errorLog = debug('api:error');

const ENV = {
  nodeEnv: (process.env.NODE_ENV || 'development').trim().toLowerCase(),
  port: process.env.PORT || 4000,
  // Support multiple origins separated by comma
  corsOrigins: process.env.CORS_ORIGINS 
    ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
    : ['http://localhost:3000', 'http://localhost:3001'],
};

const app: Express = express();

// ============================================================================
// MIDDLEWARE
// ============================================================================

const corsOptionsDelegate = (
  req: Request,
  callback: (err: Error | null, options?: cors.CorsOptions) => void
) => {
  const requestOrigin = req.headers.origin;
  let allowed = false;

  if (!requestOrigin) {
    // No Origin header — mobile app, Postman, server-to-server, etc.
    allowed = true;
  } else {
    try {
      const originHost = new URL(requestOrigin).hostname;
      if (originHost === req.hostname) {
        allowed = true;
      }
    } catch {
      // Malformed Origin header — treat as not allowed.
    }

    if (!allowed && ENV.corsOrigins.includes(requestOrigin)) {
      allowed = true;
    }
  }

  if (!allowed) {
    errorLog(`CORS blocked origin: ${requestOrigin}`);
    return callback(new Error('Not allowed by CORS'));
  }

  callback(null, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 86400, // 24 hours
  });
};

app.use(cors(corsOptionsDelegate));

// Handle preflight requests explicitly
app.options('*', cors(corsOptionsDelegate));

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
// NOTE: gated to non-production. This was previously unconditional and
// logging every request (plus body) twice in production is what drove
// the Papertrail log quota over its limit.
if (ENV.nodeEnv !== 'production') {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`📨 ${req.method} ${req.url}`);
    console.log(`📨 Body:`, JSON.stringify(req.body));
    next();
  });
}

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint with database status
/** What /health replies */
interface HealthCheck {
  status: 'ok' | 'degraded';
  timestamp: string;
  environment: string;
  allowedOrigins: string[];
  database: { status: 'unknown' | 'connected' | 'disconnected'; message: string };
}

/** What the server's own error pages reply */
interface ServerErrorReply {
  error: string;
  message: string;
  timestamp: string;
  stack?: string;
  checkedPaths?: string[];
}

app.get('/health', async (_req: Request, res: Response<HealthCheck>) => {
  const healthCheck: HealthCheck = {
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

// A browser page load (refresh, bookmark, typed address) gets the React app,
// even where a page's address starts like an API route (/wishlist/:userId).
// Set once the React build is found, below.
let reactIndexFile: string | null = null;
app.use(servePageLoads(() => reactIndexFile));

// API routes. Every route lives under /api (see API_PREFIX), so no page in the
// React app can ever share an address with the API. Add new routes to the
// table, never with app.use('/something') directly: a test checks.
const API_ROUTES: Array<[string, Router]> = [
  ['/collectpub', collectionpublisherRouter],
  ['/comicbooktitles', comicbooktitleRouter],
  ['/comicbook', comicbookRouter],
  ['/messaging', messagingRouter],
  ['/salelist', salelistRouter],
  ['/salelistALL', salelistALLRouter],
  ['/wishlist', wishlistRouter],
  ['/users', usersRouter],
  ['/auth', authRouter],
  ['/passwordreset', passwordresetRouter],
  ['/emailpasswordreset', emailPasswordResetRouter],
  ['/ai', aiScanner],
  ['/insights', collectionInsights],
  ['/search', searchRouter],
  ['/s3', s3Router],
];

for (const [routePath, router] of API_ROUTES) {
  app.use(`${API_PREFIX}${routePath}`, router);
}

// LEGACY: the addresses these routes had before everything moved under /api.
// Kept for one release so a browser tab still running the previous version of
// the app keeps working through the deploy. Remove this block in the next
// release (the API routes test lists what may still be mounted here).
for (const [routePath, router] of API_ROUTES.filter(([routePath]) => LEGACY_ROOT_ROUTES.includes(routePath))) {
  app.use(routePath, router);
}

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
    
    reactIndexFile = path.join(reactBuildPath, 'index.html');

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
    app.get('*', (_req: Request, res: Response<ServerErrorReply>) => {
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
  app.use((req: Request, res: Response<ServerErrorReply>) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.url}`,
      timestamp: new Date().toISOString()
    });
  });
}

// Global error handler
app.use((err: Error, _req: Request, res: Response<ServerErrorReply>, _next: NextFunction) => {
  errorLog('ERROR:', err.message);
  errorLog('Stack:', err.stack);

  // Don't leak error details in production
  const errorResponse: ServerErrorReply = {
    error: 'Internal Server Error',
    message: ENV.nodeEnv === 'development' ? err.message : 'An error occurred',
    timestamp: new Date().toISOString(),
    ...(ENV.nodeEnv === 'development' && { stack: err.stack })
  };

  res.status(500).json(errorResponse);
});

export default app;