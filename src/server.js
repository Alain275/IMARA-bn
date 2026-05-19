import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { connectMqtt } from './services/mqttService.js';
import { initFirebase } from './services/firebaseAdmin.js';
import { startMqttFirebaseBridge } from './services/mqttFirebaseBridge.js';
import { initRedis, closeRedis } from './services/cacheService.js';
import { initWebSocket } from './services/websocketService.js';
import logger from './services/logger.js';
import { User } from './models/User.js';
import { SensorData } from './models/SensorData.js';
import { Sensor } from './models/Sensor.js';
import { EmailLog } from './models/EmailLog.js';
import { startGreenhouseMongoSync, stopGreenhouseMongoSync } from './services/greenhouseMongoSyncService.js';
import { startPlantDiseaseHeartbeat, stopPlantDiseaseHeartbeat } from './services/plantDiseaseHttpClient.js';
import { assertJwtSecretConfiguredAtStartup } from './config/jwtSecret.js';
import { closeEmailQueue, initEmailQueue } from './services/emailQueueService.js';

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smartfarmx';
const USE_MQTT = String(process.env.USE_MQTT || 'false').toLowerCase() === 'true';

async function start() {
  try {
    assertJwtSecretConfiguredAtStartup();

    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    logger.info('Connected to MongoDB');

    // Ensure indexes are in sync
    try {
      await User.syncIndexes();
      await SensorData.syncIndexes();
      await Sensor.syncIndexes();
      await EmailLog.syncIndexes();
      logger.info('Database indexes synchronized');
    } catch (e) {
      logger.warn('Index sync warning:', e.message);
    }

    // Initialize Redis cache
    initRedis();
    initEmailQueue();

    // Initialize Firebase first (required for Firebase-only firmware mode).
    initFirebase();
    if (USE_MQTT) {
      await connectMqtt();
      startMqttFirebaseBridge();
      logger.info('MQTT mode enabled');
    } else {
      logger.info('Firebase-only mode enabled (MQTT disabled)');
    }
    startGreenhouseMongoSync();

    // Create Express app and HTTP server
    const app = createApp();
    const server = http.createServer(app);

    // Initialize WebSocket server
    initWebSocket(server);

    // Start HTTP server (handle port already in use without crashing the process twice)
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(
          `Port ${PORT} is already in use (another API instance?). Stop it or set PORT in .env, then retry.`,
        );
        process.exit(1);
      }
      throw err;
    });
    server.listen(PORT, () => {
      logger.info(`API listening on http://localhost:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Only when DISEASE_SERVICE_HEARTBEAT=true (avoids 429 noise on hosted AI).
    if (process.env.DISEASE_SERVICE_HEARTBEAT === 'true') {
      startPlantDiseaseHeartbeat();
    }

    // Graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      server.close(() => {
        logger.info('HTTP server closed');
      });

      await mongoose.connection.close();
      logger.info('MongoDB connection closed');

      await closeRedis();
      await closeEmailQueue();

      stopPlantDiseaseHeartbeat();
      stopGreenhouseMongoSync();
      
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();




