import { Sensor } from '../models/Sensor.js';
import { toUserObjectId } from '../utils/mongoIds.js';

/**
 * Resource-level authorization for device-scoped endpoints.
 * Admin can access any device. Non-admin must be owner or authorized.
 */
export function requireDeviceAccess({ queryKey = 'deviceId', defaultDeviceId = null } = {}) {
  return async (req, res, next) => {
    try {
      const deviceId = String(req.query?.[queryKey] || defaultDeviceId || '').trim();
      if (!deviceId) return res.status(400).json({ error: `${queryKey} required` });

      req.deviceId = deviceId;

      if (req.user?.role === 'admin') return next();
      if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });

      const uid = toUserObjectId(req.user.id);
      if (!uid) return res.status(403).json({ error: 'Forbidden' });

      const q = {
        deviceId,
        status: { $ne: 'inactive' },
        $or: [
          { ownerUserId: uid },
          { authorizedUserIds: uid },
        ],
      };
      const ok = await Sensor.findOne(q).lean();
      if (!ok) return res.status(403).json({ error: 'Forbidden' });

      return next();
    } catch (e) {
      return res.status(500).json({ error: 'Device authorization failed' });
    }
  };
}

