import mongoose from 'mongoose';
import { PlantPrediction } from '../models/PlantPrediction.js';
import { User } from '../models/User.js';

function parseNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseDate(v) {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function adminPredictionStats(_req, res) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [total, today, topDiseases] = await Promise.all([
    PlantPrediction.countDocuments({}),
    PlantPrediction.countDocuments({ createdAt: { $gte: startOfDay } }),
    PlantPrediction.aggregate([
      { $group: { _id: '$label', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
  ]);

  return res.json({
    totalPredictions: total,
    predictionsToday: today,
    topDiseases: topDiseases.map((x) => ({ label: x._id || 'unknown', count: x.count })),
  });
}

export async function adminListPredictions(req, res) {
  const {
    q,
    label,
    cropType,
    status,
    userId,
    minConfidence,
    maxConfidence,
    from,
    to,
    sort = 'newest',
    page = '1',
    limit = '25',
  } = req.query;

  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 25));
  const skip = (pageNum - 1) * limitNum;

  const query = {};

  if (label) query.label = String(label);
  if (cropType) query.cropType = String(cropType);
  if (status) query.status = String(status);
  if (userId && mongoose.Types.ObjectId.isValid(String(userId))) {
    query.userId = new mongoose.Types.ObjectId(String(userId));
  }

  const confMin = parseNumber(minConfidence);
  const confMax = parseNumber(maxConfidence);
  if (confMin != null || confMax != null) {
    query.confidence = {};
    if (confMin != null) query.confidence.$gte = confMin;
    if (confMax != null) query.confidence.$lte = confMax;
  }

  const fromDate = parseDate(from);
  const toDate = parseDate(to);
  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = fromDate;
    if (toDate) query.createdAt.$lte = toDate;
  }

  if (q) {
    const text = String(q).trim();
    if (text) {
      query.$or = [
        { label: { $regex: text, $options: 'i' } },
        { cropType: { $regex: text, $options: 'i' } },
        { imageFilename: { $regex: text, $options: 'i' } },
      ];
    }
  }

  const sortSpec = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 };

  const [total, rows] = await Promise.all([
    PlantPrediction.countDocuments(query),
    PlantPrediction.find(query)
      .sort(sortSpec)
      .skip(skip)
      .limit(limitNum)
      .lean(),
  ]);

  // Attach minimal user info (avoid heavy populate)
  const userIds = Array.from(new Set(rows.map((r) => String(r.userId || '')).filter(Boolean)));
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } }, { name: 1, email: 1, role: 1 }).lean()
    : [];
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return res.json({
    page: pageNum,
    limit: limitNum,
    total,
    rows: rows.map((r) => ({
      ...r,
      user: userMap.get(String(r.userId)) || null,
    })),
  });
}

export async function adminGetPrediction(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    return res.status(400).json({ error: 'Invalid prediction id' });
  }

  const row = await PlantPrediction.findById(id).lean();
  if (!row) return res.status(404).json({ error: 'Not found' });

  const user = row.userId ? await User.findById(row.userId, { name: 1, email: 1, role: 1 }).lean() : null;

  return res.json({ ...row, user: user || null });
}

