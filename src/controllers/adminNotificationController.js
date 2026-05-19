import mongoose from 'mongoose';
import { AdminNotification } from '../models/AdminNotification.js';

export async function adminListNotifications(req, res) {
  const { unreadOnly, page = 1, limit = 30 } = req.query;
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.max(1, Math.min(100, Number(limit) || 30));
  const skip = (pageNum - 1) * limitNum;

  const query = {};
  if (String(unreadOnly) === 'true') {
    query.readBy = { $ne: req.user.id };
  }

  const [total, rows] = await Promise.all([
    AdminNotification.countDocuments(query),
    AdminNotification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
  ]);

  const mapped = rows.map((n) => ({
    ...n,
    isRead: Array.isArray(n.readBy) && n.readBy.some((x) => String(x) === String(req.user.id)),
  }));

  return res.json({ page: pageNum, limit: limitNum, total, rows: mapped });
}

export async function adminMarkNotificationRead(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(String(id))) return res.status(400).json({ error: 'Invalid notification id' });
  const row = await AdminNotification.findByIdAndUpdate(
    id,
    { $addToSet: { readBy: req.user.id } },
    { new: true },
  ).lean();
  if (!row) return res.status(404).json({ error: 'Not found' });
  return res.json(row);
}

