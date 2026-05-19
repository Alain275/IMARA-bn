import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import { json } from 'express';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import iotRoutes from './routes/iotRoutes.js';
import sensorRoutes from './routes/sensorRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import learningRoutes from './routes/learningRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import metaRoutes from './routes/metaRoutes.js';
import emailTestRoutes from './routes/emailTestRoutes.js';
import deviceRequestRoutes from './routes/deviceRequestRoutes.js';
import plantHealthRoutes from './routes/plantHealthRoutes.js';
import intelligenceRoutes from './routes/intelligenceRoutes.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './services/logger.js';
import { getConnectedClients } from './services/websocketService.js';
import { getRedisClient } from './services/cacheService.js';

export function createApp() {
  const app = express();

  // When running behind a reverse proxy (Render, Nginx, etc.), trust the proxy
  // so that rate limiting and logging can correctly use X-Forwarded-* headers.
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // CORS configuration
  const allowedOrigins = (process.env.CORS_ORIGIN || process.env.CORS_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  const isLocalDevOrigin = (origin) =>
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(String(origin || ''));

  const isTrustedHostedOrigin = (origin) =>
    /^https?:\/\/([a-z0-9-]+\.)?(onrender\.com|expo\.dev|imara\.co\.rw)$/i.test(String(origin || ''));

  app.use(cors({
    origin: (origin, callback) => {
      // Allow non-browser / same-origin requests with no Origin header
      if (!origin) return callback(null, true);
      // If no explicit whitelist is set, keep browser clients working across web + mobile deployments.
      if (!allowedOrigins.length) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Vite may use 5174+ if 5173 is busy; allow any localhost origin in development
      if (process.env.NODE_ENV !== 'production' && isLocalDevOrigin(origin)) {
        return callback(null, true);
      }
      if (isTrustedHostedOrigin(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }));

  // Request logging
  app.use(requestLogger);

  // Body parser
  app.use(json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static files
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const staticDir = path.resolve(__dirname, '../uploads');
  app.use('/uploads', express.static(staticDir));

  // Health check endpoints
  app.get('/', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'IMARA API',
      docs: '/health',
    });
  });

  app.get('/health', (_req, res) => {
    res.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.get('/health/db', (_req, res) => {
    const state = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
    const name = mongoose.connection.name;
    const redis = getRedisClient();
    const redisStatus = redis ? redis.status : 'not initialized';
    
    res.json({ 
      mongo: { state, name },
      redis: { status: redisStatus },
      websocket: { clients: getConnectedClients() }
    });
  });

  // Apply rate limiting to all API routes
  app.use('/api', apiLimiter);

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/iot', iotRoutes);
  app.use('/api/sensors', sensorRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/learning', learningRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/meta', metaRoutes);
  app.use('/api/email', emailTestRoutes);
  app.use('/api/device-requests', deviceRequestRoutes);
  app.use('/api/plant-health', plantHealthRoutes);
  app.use('/api/intelligence', intelligenceRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}



