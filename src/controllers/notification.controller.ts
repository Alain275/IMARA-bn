import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import Notification from '../models/Notification';
import { Op } from 'sequelize';

// Get user notifications
export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { type, isRead, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const where: any = { userId: req.user!.id };
    if (type) where.type = type;
    if (isRead !== undefined) where.isRead = isRead === 'true';

    const { rows: notifications, count } = await Notification.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(count / Number(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get unread notification count
export const getUnreadCount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const count = await Notification.count({
      where: {
        userId: req.user!.id,
        isRead: false
      }
    });

    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
};

// Mark notification as read
export const markAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// Mark all as read
export const markAllAsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await Notification.update(
      { isRead: true },
      {
        where: {
          userId: req.user!.id,
          isRead: false
        }
      }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

// Delete notification
export const deleteNotification = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, userId: req.user!.id }
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await notification.destroy();

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Create notification (internal use)
export const createNotification = async (
  userId: string,
  type: 'weather' | 'market' | 'disease' | 'soil' | 'training' | 'system',
  title: string,
  message: string,
  data?: any,
  priority: 'low' | 'medium' | 'high' = 'medium'
) => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      data,
      priority,
      isRead: false
    });

    // Emit WebSocket event
    const { emitNotification } = require('../services/websocket');
    emitNotification(userId, notification);

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
};
