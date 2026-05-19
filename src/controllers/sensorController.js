import { Sensor } from '../models/Sensor.js';
import { toUserObjectId } from '../utils/mongoIds.js';
import { getFirebaseDb } from '../services/firebaseAdmin.js';
import crypto from 'crypto';
import { EmailTypes } from '../services/emailService.js';

export async function listSensors(req, res) {
  // Ensure the default greenhouse device appears in registry for admins when using greenhouse RTDB mode.
  if (req.user?.role === 'admin') {
    const greenhouseMode = String(process.env.FIREBASE_RTDB_MODE || 'greenhouse').toLowerCase() === 'greenhouse';
    if (greenhouseMode) {
      const exists = await Sensor.findOne({ deviceId: 'greenhouse_01' }).lean();
      if (!exists) {
        await Sensor.create({
          deviceId: 'greenhouse_01',
          label: 'Greenhouse 01',
          location: 'Greenhouse',
          status: 'active',
        });
      }
    }
  }
  const query =
    req.user?.role === 'admin'
      ? {}
      : {
          $or: [{ ownerUserId: toUserObjectId(req.user.id) }, { authorizedUserIds: toUserObjectId(req.user.id) }],
        };
  const items = await Sensor.find(query).sort({ createdAt: -1 }).lean();
  res.json(items);
}

export async function getSensor(req, res) {
  const item = await Sensor.findById(req.params.id).lean();
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
}

export async function createSensor(req, res) {
  const { deviceId, label, location } = req.body;
  if (!deviceId || !label) return res.status(400).json({ error: 'deviceId and label required' });
  const token = crypto.randomBytes(16).toString('hex');
  const created = await Sensor.create({ deviceId, label, location, ownerUserId: req.user?.id, deviceToken: token });
  // sync meta to Firebase
  try {
    const db = getFirebaseDb();
    if (db) await db.ref(`devices/${created.deviceId}/meta`).set({
      ownerUserId: req.user?.id,
      label: created.label,
      location: created.location || '',
      createdAt: Date.now()
    });
  } catch (_) {}
  if (req.user?.email) {
    EmailTypes.newDeviceAdded(
      req.user.email,
      { deviceId: created.deviceId, name: created.label, time: new Date().toISOString() },
      req.user.id,
    ).catch(() => {});
  }
  res.status(201).json(created);
}

export async function updateSensor(req, res) {
  const { id } = req.params;
  const { label, location } = req.body;
  const filter = req.user?.role === 'admin' ? { _id: id } : { _id: id, ownerUserId: toUserObjectId(req.user.id) };
  const updated = await Sensor.findOneAndUpdate(filter, { label, location }, { new: true }).lean();
  if (!updated) return res.status(404).json({ error: 'Not found' });
  // sync meta to Firebase
  try {
    const db = getFirebaseDb();
    if (db) await db.ref(`devices/${updated.deviceId}/meta`).update({
      label: updated.label,
      location: updated.location || ''
    });
  } catch (_) {}
  res.json(updated);
}

export async function deleteSensor(req, res) {
  const { id } = req.params;
  const filter = req.user?.role === 'admin' ? { _id: id } : { _id: id, ownerUserId: toUserObjectId(req.user.id) };
  const del = await Sensor.findOneAndDelete(filter).lean();
  if (!del) return res.status(404).json({ error: 'Not found' });
  try {
    const db = getFirebaseDb();
    if (db) await db.ref(`devices/${del.deviceId}/meta`).remove();
  } catch (_) {}
  res.json({ ok: true });
}

export async function regenerateToken(req, res) {
  const { id } = req.params;
  const token = crypto.randomBytes(16).toString('hex');
  const filter = req.user?.role === 'admin' ? { _id: id } : { _id: id, ownerUserId: toUserObjectId(req.user.id) };
  const updated = await Sensor.findOneAndUpdate(filter, { deviceToken: token }, { new: true }).lean();
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json({ deviceToken: updated.deviceToken });
}

export async function claimSensor(req, res) {
  const { deviceId } = req.body;
  if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
  const token = crypto.randomBytes(16).toString('hex');
  const s = await Sensor.findOneAndUpdate(
    { deviceId, ownerUserId: { $exists: false } },
    { ownerUserId: toUserObjectId(req.user.id), deviceToken: token },
    { new: true },
  );
  if (!s) return res.status(404).json({ error: 'Device not found or already claimed' });
  res.json({ ok: true, deviceToken: s.deviceToken });
}


