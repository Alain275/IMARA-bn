import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import http from 'http';
import axios from 'axios';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middleware/errorHandler';
import { connectDatabase } from './config/database';
import { swaggerDocument } from './config/swagger';
import { initializeWebSocket } from './services/websocket';

// Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/user.routes';
import farmRoutes from './routes/farm.routes';
import cropRoutes from './routes/crop.routes';
import weatherRoutes from './routes/weather.routes';
import soilRoutes from './routes/soil.routes';
import diseaseRoutes from './routes/disease.routes';
import marketRoutes from './routes/market.routes';
import notificationRoutes from './routes/notification.routes';
import agronomistRoutes from './routes/agronomist.routes';
import questionRoutes from './routes/question.routes';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Security headers

// CORS Configuration - More permissive for production
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'https://resilient-starship-55ff3d.netlify.app'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // For development, log rejected origins
    console.log('⚠️ CORS: Rejected origin:', origin);
    console.log('✅ CORS: Allowed origins:', allowedOrigins);
    
    // Don't throw error, just don't allow
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
}));

app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'IMARA API Documentation',
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    success: true,
    message: 'IMARA Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/crops', cropRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/soil', soilRoutes);
app.use('/api/disease', diseaseRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/agronomists', agronomistRoutes);
app.use('/api/questions', questionRoutes);

// 404 handler
app.all('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    
    // Create HTTP server
    const httpServer = http.createServer(app);
    
    // Initialize WebSocket
    initializeWebSocket(httpServer);
    
    httpServer.listen(PORT, async () => {
      console.log(`🚀 IMARA Backend Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API available at http://localhost:${PORT}/api`);
      console.log(`📚 API Documentation at http://localhost:${PORT}/api-docs`);
      console.log(`🔌 WebSocket server running`);

      // AI Service Health Check
      const rawUrl = process.env.AI_SERVICE_URL || process.env.ML_API_URL || 'http://localhost:8000';
      const AI_SERVICE_URL = rawUrl.replace(/\/$/, '');
      const AI_SERVICE_ENABLED = process.env.AI_SERVICE_ENABLED !== 'false';
      const AI_API_KEY = process.env.AI_SERVICE_API_KEY || process.env.ML_API_KEY;

      console.log(`\n--- AI Service Configuration ---`);
      console.log(`Enabled: ${AI_SERVICE_ENABLED}`);
      console.log(`Target URL: ${AI_SERVICE_URL}`);
      console.log(`API Key configured: ${!!AI_API_KEY ? 'Yes' : 'No'}`);
      
      if (AI_SERVICE_ENABLED) {
        try {
          await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 10000 });
          console.log(`✓ AI service reachable at ${AI_SERVICE_URL}/health`);
        } catch (err: any) {
          console.error(`✗ AI service unreachable! Failed to call ${AI_SERVICE_URL}/health`);
          console.error(`  Reason: ${err.message}`);
        }
      }
      console.log(`--------------------------------\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
