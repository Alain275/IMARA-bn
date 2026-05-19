import { User } from '../models/User.js';
import { Sensor } from '../models/Sensor.js';
import { PlantPrediction } from '../models/PlantPrediction.js';
import { EmailLog } from '../models/EmailLog.js';

export async function adminGlobalSearch(req, res) {
  const q = String(req.query.q || '').trim();
  if (!q) return res.json({ users: [], devices: [], predictions: [], emails: [] });

  const [users, devices, predictions, emails] = await Promise.all([
    User.find(
      {
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
        ],
      },
      { name: 1, email: 1, role: 1 },
    ).limit(8).lean(),
    Sensor.find(
      {
        $or: [
          { deviceId: { $regex: q, $options: 'i' } },
          { label: { $regex: q, $options: 'i' } },
          { location: { $regex: q, $options: 'i' } },
        ],
      },
      { deviceId: 1, label: 1, location: 1, ownerUserId: 1 },
    ).limit(8).lean(),
    PlantPrediction.find(
      {
        $or: [
          { label: { $regex: q, $options: 'i' } },
          { cropType: { $regex: q, $options: 'i' } },
          { imageFilename: { $regex: q, $options: 'i' } },
        ],
      },
      { label: 1, confidence: 1, createdAt: 1, userId: 1 },
    ).sort({ createdAt: -1 }).limit(8).lean(),
    EmailLog.find(
      {
        $or: [
          { to: { $regex: q, $options: 'i' } },
          { subject: { $regex: q, $options: 'i' } },
        ],
      },
      { to: 1, subject: 1, status: 1, createdAt: 1 },
    ).sort({ createdAt: -1 }).limit(8).lean(),
  ]);

  return res.json({ users, devices, predictions, emails });
}

