import mongoose from 'mongoose';
import { Sensor } from '../models/Sensor.js';
import { User } from '../models/User.js';
import { logAdminAction } from '../services/adminAuditService.js';

async function resolveUsers({ ownerUserId, ownerEmail, authorizedUserIds, authorizedEmails }) {
  let owner = null;

  if (ownerUserId && mongoose.Types.ObjectId.isValid(String(ownerUserId))) {
    owner = await User.findById(ownerUserId, { name: 1, email: 1, role: 1 }).lean();
  } else if (ownerEmail) {
    owner = await User.findOne({ email: String(ownerEmail).toLowerCase().trim() }, { name: 1, email: 1, role: 1 }).lean();
  }

  const authIds = [];

  const pushUnique = (id) => {
    const s = String(id);
    if (!authIds.includes(s)) authIds.push(s);
  };

  (Array.isArray(authorizedUserIds) ? authorizedUserIds : [])
    .filter((x) => mongoose.Types.ObjectId.isValid(String(x)))
    .forEach((x) => pushUnique(x));

  if (Array.isArray(authorizedEmails) && authorizedEmails.length) {
    const emails = authorizedEmails
      .map((e) => String(e).toLowerCase().trim())
      .filter(Boolean);
    const users = await User.find({ email: { $in: emails } }, { _id: 1 }).lean();
    users.forEach((u) => pushUnique(u._id));
  }

  return { owner, authorizedUserIdsResolved: authIds };
}

export async function adminListDevices(_req, res) {
  const rows = await Sensor.find({})
    .populate('ownerUserId', 'name email role')
    .populate('authorizedUserIds', 'name email role')
    .sort({ createdAt: -1 })
    .lean();
  return res.json(rows);
}

export async function adminListAssignableUsers(_req, res) {
  const users = await User.find({}, { name: 1, email: 1, role: 1 }).sort({ name: 1 }).lean();
  return res.json(users);
}

export async function adminUpdateDeviceAccess(req, res) {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(String(id))) {
    return res.status(400).json({ error: 'Invalid device id' });
  }

  const body = req.body || {};
  const { ownerUserId, ownerEmail, authorizedUserIds, authorizedEmails } = body;

  const { owner, authorizedUserIdsResolved } = await resolveUsers({
    ownerUserId,
    ownerEmail,
    authorizedUserIds,
    authorizedEmails,
  });

  const update = {};
  if (owner) update.ownerUserId = owner._id;
  if ('authorizedUserIds' in body || 'authorizedEmails' in body) {
    update.authorizedUserIds = authorizedUserIdsResolved;
  }

  const updated = await Sensor.findByIdAndUpdate(id, { $set: update }, { new: true })
    .populate('ownerUserId', 'name email role')
    .populate('authorizedUserIds', 'name email role')
    .lean();
  if (!updated) return res.status(404).json({ error: 'Not found' });

  await logAdminAction(req, {
    action: 'device_access_updated',
    resourceType: 'sensor',
    resourceId: id,
    details: {
      ownerUserId: updated.ownerUserId?._id || null,
      authorizedCount: Array.isArray(updated.authorizedUserIds) ? updated.authorizedUserIds.length : 0,
    },
  });

  return res.json(updated);
}

