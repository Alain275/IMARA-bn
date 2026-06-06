import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

let io: Server;
const userSockets = new Map<string, string>(); // userId -> socketId

export const initializeWebSocket = (httpServer: HTTPServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:5173',
      credentials: true
    }
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      socket.userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`✅ WebSocket client connected: ${socket.id}`);
    
    if (socket.userId) {
      userSockets.set(socket.userId, socket.id);
      console.log(`👤 User ${socket.userId} connected`);
      
      // Join user-specific room
      socket.join(`user:${socket.userId}`);
    }

    socket.on('disconnect', () => {
      console.log(`❌ WebSocket client disconnected: ${socket.id}`);
      if (socket.userId) {
        userSockets.delete(socket.userId);
      }
    });

    // Handle ping for connection health check
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  console.log('🔌 WebSocket server initialized');
  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('WebSocket not initialized');
  }
  return io;
};

// Emit notification to specific user
export const emitNotification = (userId: string, notification: any) => {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('notification', notification);
    console.log(`📨 Notification sent to user ${userId}`);
  } catch (error) {
    console.error('Failed to emit notification:', error);
  }
};

// Emit weather alert to specific user
export const emitWeatherAlert = (userId: string, alert: any) => {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('weather:alert', alert);
  } catch (error) {
    console.error('Failed to emit weather alert:', error);
  }
};

// Emit market update to specific user
export const emitMarketUpdate = (userId: string, update: any) => {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('market:update', update);
  } catch (error) {
    console.error('Failed to emit market update:', error);
  }
};

// Broadcast to all connected users
export const broadcastToAll = (event: string, data: any) => {
  try {
    const io = getIO();
    io.emit(event, data);
    console.log(`📢 Broadcast ${event} to all users`);
  } catch (error) {
    console.error('Failed to broadcast:', error);
  }
};
