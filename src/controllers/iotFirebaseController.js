import { getFirebaseDb } from '../services/firebaseAdmin.js';
import { Sensor } from '../models/Sensor.js';
import { toUserObjectId } from '../utils/mongoIds.js';
import { SensorData } from '../models/SensorData.js';
import { normalizeSoilMoisturePercent } from '../../../ai-services/utils/sensorNormalization.js';
import { evaluateDeviceHealth, pickGreenhouseTelemetryMs } from '../services/deviceHealthService.js';
import { getGreenhouseSyncStatus } from '../services/greenhouseMongoSyncService.js';

/** Per-device snapshot cache; TTL defaults to 0 (always fresh). Set GREENHOUSE_SNAPSHOT_CACHE_MS to enable. */
const snapshotCache = new Map();
const historyCache = new Map();

function isGreenhouseFirmwareMode() {
  return String(process.env.FIREBASE_RTDB_MODE || 'greenhouse').toLowerCase() === 'greenhouse';
}

function normalizeGreenhouseSensors(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const soil = normalizeSoilMoisturePercent(obj.soilMoisture ?? obj.soil);
  return {
    ...obj,
    soilMoisture: soil ?? obj.soilMoisture ?? obj.soil ?? null,
  };
}

async function readGreenhouseSnapshot(db) {
  const [sensorsSnap, actuatorsSnap, modeSnap, controlSnap, statusSnap, latestSnap, systemInfoSnap] = await Promise.all([
    db.ref('/greenhouse/sensors').get(),
    db.ref('/greenhouse/actuators').get(),
    db.ref('/greenhouse/mode').get(),
    db.ref('/greenhouse/control').get(),
    db.ref('/greenhouse/device/status').get(),
    db.ref('/greenhouse/latest').get(),
    db.ref('/greenhouse/system/info').get(),
  ]);
  const sensors = normalizeGreenhouseSensors(sensorsSnap.val() || {});
  const actuators = actuatorsSnap.val() || {};
  const controlVal = controlSnap.val() || {};
  const controlActuatorOverlay = {};
  for (const key of ['valve', 'bulb', 'fan', 'heater', 'buzzer']) {
    if (typeof controlVal[key] === 'boolean') controlActuatorOverlay[key] = controlVal[key];
  }
  const statusVal = statusSnap.val() || {};
  const latestVal = latestSnap.val() || {};
  const systemInfo = systemInfoSnap.val() || {};
  const telemetryTs = pickGreenhouseTelemetryMs({ latestVal, statusVal, sensors, systemInfo });
  const health = evaluateDeviceHealth(telemetryTs);
  const statusText =
    typeof statusVal === 'string'
      ? statusVal
      : statusVal.status || systemInfo.status || (health.state === 'online' ? 'online' : health.state);
  const modeFromControl = controlVal?.mode != null ? String(controlVal.mode).toUpperCase() : null;
  const modeFromRoot = modeSnap.val() != null ? String(modeSnap.val()).toUpperCase() : null;
  // Firmware / demo UI treat `/greenhouse/mode` as the displayed state; prefer it over `control/mode`.
  const mode = (modeFromRoot === 'AUTO' || modeFromRoot === 'MANUAL' ? modeFromRoot : null) ??
    (modeFromControl === 'AUTO' || modeFromControl === 'MANUAL' ? modeFromControl : null) ??
    'AUTO';
  return {
    ...sensors,
    ...actuators,
    ...controlActuatorOverlay,
    mode,
    status: statusText,
    timestamp: telemetryTs ?? Date.now(),
    deviceId: statusVal.device_id || systemInfo.device_id || 'greenhouse_01',
    health,
    telemetry: {
      lastUpdate: telemetryTs ?? Date.now(),
      wifiStrength: systemInfo.wifi_strength ?? null,
      freeHeap: systemInfo.free_heap ?? null,
      firmwareMessage: systemInfo.message ?? null,
    },
    sync: getGreenhouseSyncStatus(),
  };
}

async function readGreenhouseHistoryFirebase(db, limit = 120) {
  const logsSnap = await db.ref('/greenhouse/logs').limitToLast(Number(limit)).get();
  const logsVal = logsSnap.val() || {};
  const rows = Object.values(logsVal).map((row) => {
    const ts = row.timestamp != null
      ? (Number(row.timestamp) < 1e12 ? Number(row.timestamp) * 1000 : Number(row.timestamp))
      : Date.now();
    return {
      deviceId: 'greenhouse_01',
      temperature: row.temperature ?? row.temp ?? null,
      humidity: row.humidity ?? row.hum ?? null,
      soilMoisture: normalizeSoilMoisturePercent(row.soilMoisture ?? row.soil) ?? row.soilMoisture ?? null,
      lightIntensity: row.lightIntensity ?? row.light ?? row.lux ?? null,
      waterLevel: row.waterLevel ?? row.water_level ?? null,
      timestamp: ts,
    };
  });
  return rows.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
}

async function readGreenhouseHistoryMongo({ deviceId, from, limit }) {
  const cap = Math.min(Math.max(Number(limit) || 200, 1), 5000);
  const base = { deviceId };
  let docs;
  if (from) {
    const q = { ...base, timestamp: { $gte: from } };
    docs = await SensorData.find(q).sort({ timestamp: 1 }).limit(cap).lean();
  } else {
    docs = await SensorData.find(base).sort({ timestamp: -1 }).limit(cap).lean();
    docs.reverse();
  }
  return docs.map((row) => ({
    deviceId: row.deviceId,
    temperature: row.temperature ?? null,
    humidity: row.humidity ?? null,
    soilMoisture: normalizeSoilMoisturePercent(row.soilMoisture) ?? row.soilMoisture ?? null,
    lightIntensity: row.lightIntensity ?? null,
    waterLevel: row.waterLevel ?? null,
    pumpStatus: row.pumpStatus,
    timestamp: row.timestamp instanceof Date ? row.timestamp.getTime() : Number(row.timestamp) || Date.now(),
  }));
}

async function readGreenhouseHistoryMongoAggregated({ deviceId, from, to, bucketUnit = 'hour', limit = 500 }) {
  const bucketDateExpr =
    bucketUnit === 'day'
      ? { $dateTrunc: { date: '$timestamp', unit: 'day' } }
      : { $dateTrunc: { date: '$timestamp', unit: 'hour' } };
  const rows = await SensorData.aggregate([
    { $match: { deviceId, ...(from || to ? { timestamp: { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } } : {}) } },
    {
      $group: {
        _id: bucketDateExpr,
        temperature: { $avg: '$temperature' },
        humidity: { $avg: '$humidity' },
        soilMoisture: { $avg: '$soilMoisture' },
        lightIntensity: { $avg: '$lightIntensity' },
        waterLevel: { $avg: '$waterLevel' },
        minTemperature: { $min: '$temperature' },
        maxTemperature: { $max: '$temperature' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: Math.max(1, Math.min(Number(limit) || 500, 5000)) },
  ]);
  return rows.map((r) => ({
    deviceId,
    temperature: r.temperature ?? null,
    humidity: r.humidity ?? null,
    soilMoisture: normalizeSoilMoisturePercent(r.soilMoisture) ?? r.soilMoisture ?? null,
    lightIntensity: r.lightIntensity ?? null,
    waterLevel: r.waterLevel ?? null,
    minTemperature: r.minTemperature ?? null,
    maxTemperature: r.maxTemperature ?? null,
    sampleCount: r.count || 0,
    timestamp: r._id instanceof Date ? r._id.getTime() : Number(r._id) || Date.now(),
  }));
}

export async function firebaseRecent(req, res) {
  const db = getFirebaseDb();
  if (!db) return res.status(503).json({ error: 'Firebase not configured' });
  const { deviceId, limit = 50 } = req.query;
  if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
  // Access control: admin → any; others → must own or be authorized for device
  if (req.user?.role !== 'admin') {
    const uid = toUserObjectId(req.user.id);
    if (!uid) return res.status(403).json({ error: 'Forbidden' });
    const own = await Sensor.findOne({
      deviceId,
      $or: [{ ownerUserId: uid }, { authorizedUserIds: uid }],
    }).lean();
    if (!own) return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    if (isGreenhouseFirmwareMode()) {
      const row = await readGreenhouseSnapshot(db);
      return res.json([row]);
    }
    const snap = await db.ref(`devices/${deviceId}/data`).limitToLast(Number(limit)).get();
    const val = snap.val() || {};
    const rows = Object.values(val).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    res.json(rows);
  } catch (e) {
    res.status(400).json({ error: 'Firebase fetch failed', details: e.message });
  }
}

export async function firebaseRecentPublic(req, res) {
  const db = getFirebaseDb();
  if (!db) return res.status(503).json({ error: 'Firebase not configured' });
  const { deviceId, limit = 50 } = req.query;
  if (!deviceId) return res.status(400).json({ error: 'deviceId required' });
  try {
    if (isGreenhouseFirmwareMode()) {
      const row = await readGreenhouseSnapshot(db);
      return res.json([row]);
    }
    const snap = await db.ref(`devices/${deviceId}/data`).limitToLast(Number(limit)).get();
    const val = snap.val() || {};
    const rows = Object.values(val).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    res.json(rows);
  } catch (e) {
    res.status(400).json({ error: 'Firebase fetch failed', details: e.message });
  }
}

export async function greenhouseSnapshot(_req, res) {
  const deviceId = String(_req.deviceId || _req.query?.deviceId || 'greenhouse_01');
  const db = getFirebaseDb();
  if (!db) return res.status(503).json({ error: 'Firebase not configured' });
  try {
    const cacheTtlMs = Number(process.env.GREENHOUSE_SNAPSHOT_CACHE_MS ?? 0);
    if (cacheTtlMs > 0) {
      const hit = snapshotCache.get(deviceId);
      if (hit && Date.now() - hit.ts < cacheTtlMs) {
        return res.json(hit.value);
      }
    }
    const row = await readGreenhouseSnapshot(db);
    await Sensor.updateOne(
      { deviceId },
      {
        $set: {
          lastSeen: row?.health?.lastTelemetryAt ? new Date(row.health.lastTelemetryAt) : new Date(),
          healthState: row?.health?.state || 'offline',
          telemetryLatencyMs: row?.health?.latencyMs ?? null,
        },
      },
      { upsert: true },
    );
    snapshotCache.set(deviceId, { value: row, ts: Date.now() });
    res.json(row);
  } catch (e) {
    res.status(400).json({ error: 'Greenhouse snapshot failed', details: e.message });
  }
}

export async function greenhouseHistory(req, res) {
  const db = getFirebaseDb();
  const deviceId = String(req.query.deviceId || 'greenhouse_01');
  const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 5000);
  const minutes = req.query.minutes != null ? Number(req.query.minutes) : null;
  const hours = req.query.hours != null ? Number(req.query.hours) : null;
  const source = String(req.query.source || 'auto').toLowerCase();
  const range = String(req.query.range || '').toLowerCase();
  const cacheKey = JSON.stringify({ deviceId, limit, minutes, hours, source, range });

  const fromDate = (() => {
    if (range === 'live') return new Date(Date.now() - 2 * 60 * 60 * 1000);
    if (range === '24h') return new Date(Date.now() - 24 * 3600 * 1000);
    if (range === '7d') return new Date(Date.now() - 7 * 24 * 3600 * 1000);
    if (range === '30d') return new Date(Date.now() - 30 * 24 * 3600 * 1000);
    if (minutes != null && !Number.isNaN(minutes) && minutes > 0) {
      return new Date(Date.now() - minutes * 60 * 1000);
    }
    if (hours != null && !Number.isNaN(hours) && hours > 0) {
      return new Date(Date.now() - hours * 3600 * 1000);
    }
    return null;
  })();

  try {
    const cached = historyCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < 5000) {
      return res.json(cached.value);
    }
    if (source === 'mongo') {
      const bucketUnit = range === '30d' ? 'day' : range === '7d' ? 'hour' : null;
      const mongoRows = bucketUnit
        ? await readGreenhouseHistoryMongoAggregated({ deviceId, from: fromDate, to: new Date(), bucketUnit, limit })
        : await readGreenhouseHistoryMongo({ deviceId, from: fromDate, limit });
      historyCache.set(cacheKey, { value: mongoRows, ts: Date.now() });
      return res.json(mongoRows);
    }

    if (!db) {
      const mongoRows = await readGreenhouseHistoryMongo({ deviceId, from: fromDate, limit });
      if (mongoRows.length) return res.json(mongoRows);
      return res.status(503).json({ error: 'Firebase not configured' });
    }

    let fbRows = await readGreenhouseHistoryFirebase(db, limit);
    if (fromDate) {
      fbRows = fbRows.filter((r) => (r.timestamp || 0) >= fromDate.getTime());
    }

    if (source === 'firebase') {
      historyCache.set(cacheKey, { value: fbRows, ts: Date.now() });
      return res.json(fbRows);
    }

    // auto: live = firebase-first, 24h = hybrid, longer windows = mongo-first
    const mongoPreferredRange = range === '7d' || range === '30d';
    const wantMongo =
      mongoPreferredRange ||
      (minutes != null && minutes >= 5) ||
      (hours != null && hours >= 1) ||
      limit > 300;
    let mongoRows = [];
    if (wantMongo || !fbRows.length) {
      const bucketUnit = range === '30d' ? 'day' : range === '7d' ? 'hour' : null;
      mongoRows = bucketUnit
        ? await readGreenhouseHistoryMongoAggregated({ deviceId, from: fromDate, to: new Date(), bucketUnit, limit })
        : await readGreenhouseHistoryMongo({ deviceId, from: fromDate, limit });
    }

    if (!mongoRows.length) {
      historyCache.set(cacheKey, { value: fbRows, ts: Date.now() });
      return res.json(fbRows);
    }
    if (!fbRows.length) {
      historyCache.set(cacheKey, { value: mongoRows, ts: Date.now() });
      return res.json(mongoRows);
    }

    const byTs = new Map();
    const bucketMs = range === '30d' ? 24 * 3600 * 1000 : range === '7d' ? 3600 * 1000 : 60 * 1000;
    const keyFor = (ts) => Math.floor(Number(ts || 0) / bucketMs) * bucketMs;
    for (const r of mongoRows) byTs.set(keyFor(r.timestamp), r);
    for (const r of fbRows) {
      const k = keyFor(r.timestamp);
      if (!byTs.has(k)) byTs.set(k, r);
    }
    const merged = [...byTs.values()].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    const trimmed = merged.slice(-limit);
    historyCache.set(cacheKey, { value: trimmed, ts: Date.now() });
    return res.json(trimmed);
  } catch (e) {
    res.status(400).json({ error: 'Greenhouse history failed', details: e.message });
  }
}

export async function greenhouseSyncStatus(req, res) {
  const deviceId = String(req.query.deviceId || 'greenhouse_01');
  try {
    const db = getFirebaseDb();
    let health = null;
    if (db) {
      try {
        const row = await readGreenhouseSnapshot(db);
        if (row?.health) health = row.health;
      } catch (_) {
        /* fall back to Mongo */
      }
    }
    const sensor = await Sensor.findOne({ deviceId }).lean();
    const mongoHealth = evaluateDeviceHealth(sensor?.lastSeen || null);
    if (!health || health.lastTelemetryAt == null) health = mongoHealth;
    const sync = getGreenhouseSyncStatus();
    return res.json({
      deviceId,
      health: {
        state: health.state,
        latencyMs: health.latencyMs ?? sensor?.telemetryLatencyMs ?? null,
        lastTelemetryAt: health.lastTelemetryAt ?? (sensor?.lastSeen ? new Date(sensor.lastSeen).getTime() : null),
        offlineAfterMs: health.offlineAfterMs,
        staleAfterMs: health.staleAfterMs,
      },
      sync,
    });
  } catch (e) {
    return res.status(400).json({ error: 'Greenhouse sync status failed', details: e.message });
  }
}

export async function greenhouseThresholds(req, res) {
  const db = getFirebaseDb();
  if (!db) return res.status(503).json({ error: 'Firebase not configured' });
  try {
    const snap = await db.ref('/greenhouse/thresholds').get();
    res.json(snap.val() || {});
  } catch (e) {
    res.status(400).json({ error: 'Greenhouse thresholds fetch failed', details: e.message });
  }
}

export async function greenhouseUpdateThresholds(req, res) {
  const db = getFirebaseDb();
  if (!db) return res.status(503).json({ error: 'Firebase not configured' });
  try {
    const payload = req.body || {};
    await db.ref('/greenhouse/thresholds').update(payload);
    const snap = await db.ref('/greenhouse/thresholds').get();
    res.json({ ok: true, thresholds: snap.val() || {} });
  } catch (e) {
    res.status(400).json({ error: 'Greenhouse thresholds update failed', details: e.message });
  }
}

export async function greenhouseUpdateMode(req, res) {
  const db = getFirebaseDb();
  if (!db) return res.status(503).json({ error: 'Firebase not configured' });
  try {
    const mode = String(req.body?.mode || '').toUpperCase();
    if (!['AUTO', 'MANUAL'].includes(mode)) return res.status(400).json({ error: 'mode must be AUTO or MANUAL' });
    await db.ref().update({
      '/greenhouse/control/mode': mode,
      '/greenhouse/mode': mode,
    });
    res.json({ ok: true, mode });
  } catch (e) {
    res.status(400).json({ error: 'Greenhouse mode update failed', details: e.message });
  }
}

export async function greenhouseUpdateActuators(req, res) {
  const db = getFirebaseDb();
  if (!db) return res.status(503).json({ error: 'Firebase not configured' });
  try {
    const controls = req.body?.controls || {};
    const allowed = ['valve', 'bulb', 'fan', 'heater', 'buzzer'];
    const updates = {};
    for (const key of allowed) {
      if (typeof controls[key] === 'boolean') {
        updates[`/greenhouse/control/${key}`] = controls[key];
      }
    }
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No valid actuator controls provided' });
    await db.ref().update(updates);
    res.json({ ok: true, controls });
  } catch (e) {
    res.status(400).json({ error: 'Greenhouse actuator update failed', details: e.message });
  }
}






