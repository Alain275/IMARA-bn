import { getFirebaseDb } from './firebaseAdmin.js';
import { SensorData } from '../models/SensorData.js';
import logger from './logger.js';
import { normalizeTimestamp } from './deviceHealthService.js';

let intervalRef = null;
let lastSignature = '';
const syncState = {
  enabled: false,
  running: false,
  intervalMs: 60 * 1000,
  lastRunAt: null,
  lastSuccessAt: null,
  lastError: null,
  inserted: 0,
  duplicates: 0,
};

function normalizeSnapshot(snapshot) {
  const rawTs =
    snapshot?.timestamp ??
    snapshot?.lastUpdate ??
    snapshot?.updatedAt ??
    snapshot?.systemTimestamp;
  const normalizedTs = normalizeTimestamp(rawTs) || Date.now();
  return {
    deviceId: snapshot?.deviceId || 'greenhouse_01',
    temperature: snapshot?.temperature ?? null,
    humidity: snapshot?.humidity ?? null,
    soilMoisture: snapshot?.soilMoisture ?? null,
    lightIntensity: snapshot?.lightIntensity ?? null,
    waterLevel: snapshot?.waterLevel ?? null,
    mode: snapshot?.mode || undefined,
    valve: typeof snapshot?.valve === 'boolean' ? snapshot.valve : undefined,
    bulb: typeof snapshot?.bulb === 'boolean' ? snapshot.bulb : undefined,
    fan: typeof snapshot?.fan === 'boolean' ? snapshot.fan : undefined,
    heater: typeof snapshot?.heater === 'boolean' ? snapshot.heater : undefined,
    buzzer: typeof snapshot?.buzzer === 'boolean' ? snapshot.buzzer : undefined,
    status: snapshot?.status || 'online',
    timestamp: new Date(normalizedTs),
  };
}

async function readSnapshot() {
  const db = getFirebaseDb();
  if (!db) return null;
  const [sensorsSnap, actuatorsSnap, modeSnap, statusSnap, latestSnap, systemInfoSnap] = await Promise.all([
    db.ref('/greenhouse/sensors').get(),
    db.ref('/greenhouse/actuators').get(),
    db.ref('/greenhouse/mode').get(),
    db.ref('/greenhouse/device/status').get(),
    db.ref('/greenhouse/latest').get(),
    db.ref('/greenhouse/system/info').get(),
  ]);
  const statusVal = statusSnap.val() || {};
  const latestVal = latestSnap.val() || {};
  const systemInfoVal = systemInfoSnap.val() || {};
  const statusText = typeof statusVal === 'string' ? statusVal : statusVal.status || systemInfoVal.status || 'online';
  return {
    ...(sensorsSnap.val() || {}),
    ...(actuatorsSnap.val() || {}),
    mode: modeSnap.val() || 'AUTO',
    status: statusText,
    deviceId: statusVal.device_id || systemInfoVal.device_id || 'greenhouse_01',
    timestamp:
      latestVal.timestamp ??
      statusVal.lastUpdate ??
      statusVal.timestamp ??
      systemInfoVal.timestamp ??
      null,
    systemTimestamp: systemInfoVal.timestamp ?? null,
    lastUpdate: statusVal.lastUpdate ?? null,
  };
}

async function syncOnce() {
  syncState.running = true;
  syncState.lastRunAt = new Date();
  try {
    const snap = await readSnapshot();
    if (!snap) return;
    const payload = normalizeSnapshot(snap);
    const signature = JSON.stringify({
      temperature: payload.temperature,
      humidity: payload.humidity,
      soilMoisture: payload.soilMoisture,
      lightIntensity: payload.lightIntensity,
      waterLevel: payload.waterLevel,
      mode: payload.mode,
      valve: payload.valve,
      fan: payload.fan,
      bulb: payload.bulb,
      heater: payload.heater,
      buzzer: payload.buzzer,
    });
    if (signature === lastSignature) {
      syncState.duplicates += 1;
      return;
    }
    const result = await SensorData.updateOne(
      { deviceId: payload.deviceId, timestamp: payload.timestamp },
      { $setOnInsert: payload },
      { upsert: true },
    );
    if (result.upsertedCount === 0) {
      syncState.duplicates += 1;
      return;
    }
    lastSignature = signature;
    syncState.inserted += 1;
    syncState.lastSuccessAt = new Date();
    syncState.lastError = null;
    logger.info('Greenhouse snapshot synced to MongoDB');
  } catch (e) {
    syncState.lastError = e.message;
    logger.warn(`Greenhouse Mongo sync failed: ${e.message}`);
  } finally {
    syncState.running = false;
  }
}

export function startGreenhouseMongoSync() {
  if (intervalRef) return;
  const enabled = String(process.env.GREENHOUSE_MONGO_SYNC || 'true').toLowerCase() === 'true';
  syncState.enabled = enabled;
  if (!enabled) return;
  const everyMs = Math.max(10_000, Number(process.env.GREENHOUSE_MONGO_SYNC_INTERVAL_MS || 60_000));
  syncState.intervalMs = everyMs;
  syncOnce();
  intervalRef = setInterval(syncOnce, everyMs);
  logger.info('Greenhouse Mongo sync service started');
}

export function stopGreenhouseMongoSync() {
  if (!intervalRef) return;
  clearInterval(intervalRef);
  intervalRef = null;
  syncState.running = false;
  logger.info('Greenhouse Mongo sync service stopped');
}

export function getGreenhouseSyncStatus() {
  return {
    ...syncState,
    queue: {
      retries: Number(process.env.GREENHOUSE_MONGO_SYNC_RETRIES || 0),
    },
  };
}

