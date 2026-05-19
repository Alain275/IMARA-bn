import { SensorData } from '../models/SensorData.js';
import { Sensor } from '../models/Sensor.js';
import { getFirebaseDb } from '../services/firebaseAdmin.js';
import { toUserObjectId } from '../utils/mongoIds.js';

function isMqttEnabled() {
  return String(process.env.USE_MQTT || 'false').toLowerCase() === 'true';
}

export async function ingest(req, res) {
  try {
    const {
      deviceId,
      temperature,
      humidity,
      soilMoisture,
      lightIntensity,
      waterLevel,
      mode,
      valve,
      bulb,
      fan,
      heater,
      buzzer,
      status,
      timestamp,
      deviceToken
    } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    // If deviceToken provided, validate ownership via sensor record
    if (deviceToken) {
      const sensor = await Sensor.findOne({ deviceId, deviceToken });
      if (!sensor) return res.status(401).json({ error: 'Invalid device token' });
      await Sensor.updateOne({ _id: sensor._id }, { $set: { lastSeen: new Date() } });
    }
    const reading = await SensorData.create({
      deviceId,
      temperature,
      humidity,
      soilMoisture,
      lightIntensity,
      waterLevel,
      mode,
      valve,
      bulb,
      fan,
      heater,
      buzzer,
      status,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    res.status(201).json({ id: reading._id });
  } catch (e) {
    res.status(400).json({ error: 'Ingest failed', details: e.message });
  }
}

export async function control(req, res) {
  try {
    const { deviceId, command, pump, mode, controls } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    const uid = toUserObjectId(req.user?.id);
    const filter =
      req.user?.role === 'admin'
        ? { deviceId }
        : { deviceId, $or: [{ ownerUserId: uid }, { authorizedUserIds: uid }] };
    const sensor = await Sensor.findOne(filter).lean();
    if (!sensor) return res.status(404).json({ error: 'Device not found' });
    // Normalize outgoing payload for firmware compatibility.
    let payload = {};
    if (typeof mode === 'string') payload.mode = mode.toUpperCase() === 'MANUAL' ? 'MANUAL' : 'AUTO';
    if (controls && typeof controls === 'object') {
      payload = { ...payload, ...controls };
    }
    if (typeof pump === 'string') {
      payload.pump = pump.toUpperCase() === 'ON' ? 'ON' : 'OFF';
    } else if (typeof command === 'string') {
      // Map common commands to pump directive
      const c = command.toUpperCase();
      if (c === 'PUMP_ON' || c === 'ON') payload.pump = 'ON';
      else if (c === 'PUMP_OFF' || c === 'OFF') payload.pump = 'OFF';
      else payload.command = command;
    }
    if (Object.keys(payload).length === 0) return res.status(400).json({ error: 'Provide controls, mode, pump, or command' });

    if (!isMqttEnabled()) {
      const db = getFirebaseDb();
      if (!db) return res.status(503).json({ error: 'Firebase not configured' });
      const updates = {};
      if (payload.mode) {
        updates['/greenhouse/control/mode'] = payload.mode;
        updates['/greenhouse/mode'] = payload.mode;
      }
      if (payload.pump) updates['/greenhouse/control/valve'] = String(payload.pump).toUpperCase() === 'ON';
      if (typeof payload.valve === 'boolean') updates['/greenhouse/control/valve'] = payload.valve;
      if (typeof payload.bulb === 'boolean') updates['/greenhouse/control/bulb'] = payload.bulb;
      if (typeof payload.fan === 'boolean') updates['/greenhouse/control/fan'] = payload.fan;
      if (typeof payload.heater === 'boolean') updates['/greenhouse/control/heater'] = payload.heater;
      if (typeof payload.buzzer === 'boolean') updates['/greenhouse/control/buzzer'] = payload.buzzer;
      await db.ref().update(updates);
      return res.json({ ok: true, mode: 'firebase-only', updates });
    }

    const { getMqttClient } = await import('../services/mqttService.js');
    const client = getMqttClient();
    if (!client) return res.status(500).json({ error: 'MQTT not connected' });
    const topicNoSlash = `smartfarmx/device/${deviceId}/command`;
    const topicWithSlash = `/smartfarmx/device/${deviceId}/command`;
    const msg = JSON.stringify(payload);
    client.publish(topicNoSlash, msg);
    client.publish(topicWithSlash, msg);
    return res.json({ ok: true, mode: 'mqtt' });
  } catch (e) {
    res.status(400).json({ error: 'Control failed', details: e.message });
  }
}

// Public control for demo device only (no auth). Restricts to pump ON/OFF.
export async function controlPublic(req, res) {
  try {
    const { deviceId, pump } = req.body;
    const demoId = process.env.DEMO_DEVICE_ID || 'abc123';
    if (!deviceId || !pump) return res.status(400).json({ error: 'deviceId and pump required' });
    if (deviceId !== demoId) return res.status(403).json({ error: 'Forbidden for non-demo device' });
    const pumpOn = String(pump).toUpperCase() === 'ON';

    if (!isMqttEnabled()) {
      const db = getFirebaseDb();
      if (!db) return res.status(503).json({ error: 'Firebase not configured' });
      await db.ref('/greenhouse/control/valve').set(pumpOn);
      return res.json({ ok: true, mode: 'firebase-only' });
    }

    const { getMqttClient } = await import('../services/mqttService.js');
    const client = getMqttClient();
    if (!client) return res.status(500).json({ error: 'MQTT not connected' });
    const topicNoSlash = `smartfarmx/device/${deviceId}/command`;
    const topicWithSlash = `/smartfarmx/device/${deviceId}/command`;
    const payload = JSON.stringify({ pump: pumpOn ? 'ON' : 'OFF' });
    client.publish(topicNoSlash, payload);
    client.publish(topicWithSlash, payload);
    res.json({ ok: true, mode: 'mqtt' });
  } catch (e) {
    res.status(400).json({ error: 'Public control failed', details: e.message });
  }
}

export async function recent(req, res) {
  try {
    const { deviceId, limit = 20 } = req.query;
    const q = {};
    if (deviceId) {
      // if specific device, ensure access
      if (req.user?.role !== 'admin') {
        const own = await Sensor.findOne({
          deviceId,
          $or: [{ ownerUserId: toUserObjectId(req.user.id) }, { authorizedUserIds: toUserObjectId(req.user.id) }],
        }).lean();
        if (!own) return res.status(403).json({ error: 'Forbidden' });
      }
      q.deviceId = deviceId;
    } else if (req.user?.role !== 'admin') {
      // limit to user's devices
      const devices = await Sensor.find(
        { $or: [{ ownerUserId: toUserObjectId(req.user.id) }, { authorizedUserIds: toUserObjectId(req.user.id) }] },
        { deviceId: 1, _id: 0 },
      ).lean();
      q.deviceId = { $in: devices.map(d => d.deviceId) };
    }
    const items = await SensorData.find(q).sort({ timestamp: -1 }).limit(Number(limit)).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: 'Recent fetch failed', details: e.message });
  }
}

// Public variant for test/demo: requires deviceId, no auth ownership checks
export async function recentPublic(req, res) {
  try {
    const { deviceId, limit = 20 } = req.query;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    const items = await SensorData.find({ deviceId }).sort({ timestamp: -1 }).limit(Number(limit)).lean();
    res.json(items);
  } catch (e) {
    res.status(400).json({ error: 'Recent public fetch failed', details: e.message });
  }
}

export async function series(req, res) {
  try {
    const { deviceId, metric = 'soilMoisture', limit = 200 } = req.query;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    const fields = ['temperature', 'humidity', 'soilMoisture', 'lightIntensity', 'waterLevel'];
    if (!fields.includes(metric)) return res.status(400).json({ error: 'invalid metric' });
    if (req.user?.role !== 'admin') {
      const own = await Sensor.findOne({
        deviceId,
        $or: [{ ownerUserId: toUserObjectId(req.user.id) }, { authorizedUserIds: toUserObjectId(req.user.id) }],
      }).lean();
      if (!own) return res.status(403).json({ error: 'Forbidden' });
    }
    const items = await SensorData.find({ deviceId }, { [metric]: 1, timestamp: 1, _id: 0 })
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .lean();
    res.json(items.reverse());
  } catch (e) {
    res.status(400).json({ error: 'Series fetch failed', details: e.message });
  }
}

export async function seriesPublic(req, res) {
  try {
    const { deviceId, metric = 'soilMoisture', limit = 200 } = req.query;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
    const fields = ['temperature', 'humidity', 'soilMoisture', 'lightIntensity', 'waterLevel'];
    if (!fields.includes(metric)) return res.status(400).json({ error: 'invalid metric' });
    const items = await SensorData.find({ deviceId }, { [metric]: 1, timestamp: 1, _id: 0 })
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .lean();
    res.json(items.reverse());
  } catch (e) {
    res.status(400).json({ error: 'Series public fetch failed', details: e.message });
  }
}

export async function summary(req, res) {
  try {
    const { deviceId, sinceHours = 24 } = req.query;
    const since = new Date(Date.now() - Number(sinceHours) * 3600 * 1000);
    const match = { timestamp: { $gte: since } };
    if (deviceId) {
      if (req.user?.role !== 'admin') {
        const own = await Sensor.findOne({
          deviceId,
          $or: [{ ownerUserId: toUserObjectId(req.user.id) }, { authorizedUserIds: toUserObjectId(req.user.id) }],
        }).lean();
        if (!own) return res.status(403).json({ error: 'Forbidden' });
      }
      match.deviceId = deviceId;
    } else if (req.user?.role !== 'admin') {
      const devices = await Sensor.find(
        { $or: [{ ownerUserId: toUserObjectId(req.user.id) }, { authorizedUserIds: toUserObjectId(req.user.id) }] },
        { deviceId: 1, _id: 0 },
      ).lean();
      match.deviceId = { $in: devices.map(d => d.deviceId) };
    }
    const agg = await SensorData.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$deviceId',
          count: { $sum: 1 },
          temperatureAvg: { $avg: '$temperature' },
          humidityAvg: { $avg: '$humidity' },
          soilMoistureAvg: { $avg: '$soilMoisture' },
          lightIntensityAvg: { $avg: '$lightIntensity' },
          waterLevelAvg: { $avg: '$waterLevel' }
        }
      }
    ]);
    res.json(agg);
  } catch (e) {
    res.status(400).json({ error: 'Summary failed', details: e.message });
  }
}



