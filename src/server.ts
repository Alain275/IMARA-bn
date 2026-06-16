import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import http from 'http';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middleware/errorHandler';
import { connectDatabase } from './config/database';
import { swaggerDocument } from './config/swagger';
import { initializeWebSocket } from './services/websocket';

// Routes
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/user.routes';
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
  : ['http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // For development, log rejected origins
    console.log('Rejected origin:', origin);
    return callback(new Error('Not allowed by CORS'));
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
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 IMARA Backend Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API available at http://localhost:${PORT}/api`);
      console.log(`📚 API Documentation at http://localhost:${PORT}/api-docs`);
      console.log(`🔌 WebSocket server running`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
