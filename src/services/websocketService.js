/**
 * WebSocket service for real-time updates
 * Provides live sensor data, notifications, and device status updates
 */
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from './logger.js';
import { Sensor } from '../models/Sensor.js';
import { getJwtSecret } from '../config/jwtSecret.js';

let io = null;

/**
 * Initialize WebSocket server
 */
function socketCorsConfig() {
  const list = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV === 'production') {
    return { origin: list.length ? list : false, credentials: true };
  }
  // Development: allow any origin so Vite on 5173, 5174, etc. can connect
  return { origin: true, credentials: true };
}

export function initWebSocket(httpServer) {
  const { origin, credentials } = socketCorsConfig();
  io = new Server(httpServer, {
    cors: { origin, credentials },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      // Allow anonymous connections but mark them
      socket.data.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, getJwtSecret());
      socket.data.user = decoded;
      next();
    } catch (error) {
      logger.warn('WebSocket authentication failed:', error.message);
      socket.data.user = null;
      next();
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    const userId = socket.data.user?.id;
    logger.info(`WebSocket client connected: ${socket.id}${userId ? ` (user: ${userId})` : ' (anonymous)'}`);

    // Join user-specific room if authenticated
    if (userId) {
      socket.join(`user:${userId}`);
      logger.debug(`User ${userId} joined their room`);
    }

    // Subscribe to device updates
    socket.on('subscribe:device', async (deviceId) => {
      try {
        const id = String(deviceId || '').trim();
        if (!id) return;
        if (!userId) return socket.emit('error', { message: 'Authentication required' });

        if (socket.data.user?.role !== 'admin') {
          const ok = await Sensor.findOne({
            deviceId: id,
            $or: [{ ownerUserId: userId }, { authorizedUserIds: userId }],
          }).lean();
          if (!ok) return socket.emit('error', { message: 'Forbidden' });
        }

        socket.join(`device:${id}`);
        logger.debug(`Socket ${socket.id} subscribed to device ${id}`);
        socket.emit('subscribed', { deviceId: id });
      } catch (e) {
        socket.emit('error', { message: 'Subscription failed' });
      }
    });

    // Unsubscribe from device updates
    socket.on('unsubscribe:device', (deviceId) => {
      if (!deviceId) return;
      socket.leave(`device:${deviceId}`);
      logger.debug(`Socket ${socket.id} unsubscribed from device ${deviceId}`);
      socket.emit('unsubscribed', { deviceId });
    });

    // Subscribe to all devices for a user
    socket.on('subscribe:user:devices', async () => {
      if (!userId) {
        return socket.emit('error', { message: 'Authentication required' });
      }
      
      const sensors = await Sensor.find(
        socket.data.user?.role === 'admin'
          ? {}
          : { $or: [{ ownerUserId: userId }, { authorizedUserIds: userId }] },
        { deviceId: 1, _id: 0 },
      ).lean();
      const ids = sensors.map((s) => s.deviceId).filter(Boolean);
      for (const id of ids) socket.join(`device:${id}`);

      socket.join(`user:${userId}:devices`);
      logger.debug(`User ${userId} subscribed to ${ids.length} devices`);
      socket.emit('subscribed', { type: 'user:devices', deviceIds: ids });
    });

    // Ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Disconnection handler
    socket.on('disconnect', (reason) => {
      logger.info(`WebSocket client disconnected: ${socket.id} (reason: ${reason})`);
    });

    // Error handler
    socket.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });
  });

  logger.info('✅ WebSocket server initialized');
  return io;
}

/**
 * Get WebSocket server instance
 */
export function getIO() {
  if (!io) {
    throw new Error('WebSocket server not initialized. Call initWebSocket first.');
  }
  return io;
}

/**
 * Emit events to clients
 */
export const wsEmit = {
  /**
   * Emit new sensor data to device subscribers
   */
  sensorData(deviceId, data) {
    if (!io) return;
    io.to(`device:${deviceId}`).emit('sensor:data', {
      deviceId,
      data,
      timestamp: new Date().toISOString(),
    });
    logger.debug(`Emitted sensor data for device ${deviceId}`);
  },

  /**
   * Emit device status change
   */
  deviceStatus(deviceId, status) {
    if (!io) return;
    io.to(`device:${deviceId}`).emit('device:status', {
      deviceId,
      status,
      timestamp: new Date().toISOString(),
    });
    logger.debug(`Emitted device status for ${deviceId}: ${status}`);
  },

  /**
   * Emit pump status change
   */
  pumpStatus(deviceId, status) {
    if (!io) return;
    io.to(`device:${deviceId}`).emit('pump:status', {
      deviceId,
      status,
      timestamp: new Date().toISOString(),
    });
    logger.debug(`Emitted pump status for ${deviceId}: ${status}`);
  },

  /**
   * Emit notification to specific user
   */
  userNotification(userId, notification) {
    if (!io) return;
    io.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });
    logger.debug(`Sent notification to user ${userId}`);
  },

  /**
   * Emit alert (critical notification)
   */
  alert(deviceId, alert) {
    if (!io) return;
    io.to(`device:${deviceId}`).emit('alert', {
      deviceId,
      ...alert,
      timestamp: new Date().toISOString(),
    });
    logger.info(`Sent alert for device ${deviceId}: ${alert.type}`);
  },

  /**
   * Broadcast to all connected clients
   */
  broadcast(event, data) {
    if (!io) return;
    io.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    logger.debug(`Broadcast event: ${event}`);
  },

  /**
   * Emit to specific user's devices
   */
  userDevices(userId, event, data) {
    if (!io) return;
    io.to(`user:${userId}:devices`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    logger.debug(`Emitted ${event} to user ${userId} devices`);
  },
};

/**
 * Get connected clients count
 */
export function getConnectedClients() {
  if (!io) return 0;
  return io.engine.clientsCount;
}

/**
 * Get clients in a specific room
 */
export async function getRoomClients(room) {
  if (!io) return [];
  const sockets = await io.in(room).fetchSockets();
  return sockets.map(s => s.id);
}
