import mqtt from 'mqtt';
import { getFirebaseDb } from './firebaseAdmin.js';

let client;
let started = false;
function asBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') return ['true', '1', 'on'].includes(v.toLowerCase());
  return undefined;
}

export function startMqttFirebaseBridge() {
  if (started) return;
  const db = getFirebaseDb();
  if (!db) {
    console.warn('[mqttFirebaseBridge] Firebase not initialized. Bridge disabled.');
    return;
  }
  const url = (() => {
    if (process.env.MQTT_URL) return process.env.MQTT_URL;
    const host = process.env.MQTT_HOST || 'broker.hivemq.com';
    const port = Number(process.env.MQTT_PORT || 1883);
    const secure = String(process.env.MQTT_SECURE || '').toLowerCase() === 'true' || port === 8883;
    return `${secure ? 'mqtts' : 'mqtt'}://${host}:${port}`;
  })();
  const isTls = url.startsWith('mqtts://');
  client = mqtt.connect(url, {
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    reconnectPeriod: 2000,
    rejectUnauthorized: false,
    protocol: isTls ? 'mqtts' : 'mqtt'
  });
  client.on('connect', () => {
    console.log('[mqttFirebaseBridge] Connected to MQTT');
    client.subscribe('smartfarmx/device/+/data');
    client.subscribe('/smartfarmx/device/+/data');
  });
  client.on('message', (topic, msg) => {
    try {
      const payload = JSON.parse(msg.toString());
      const deviceId = payload.device_id || payload.deviceId || (() => {
        const parts = topic.split('/').filter(Boolean);
        const idx = parts.indexOf('device');
        return idx >= 0 && parts[idx + 1] ? parts[idx + 1] : undefined;
      })();
      if (!deviceId) return;
      // Normalize simple fields for consistency in Firebase
      const normalized = {
        deviceId,
        temperature: payload.temperature ?? payload.temp ?? undefined,
        humidity: payload.humidity ?? payload.hum ?? undefined,
        soilMoisture: payload.soilMoisture ?? payload.soil ?? payload.soil_pct ?? undefined,
        lightIntensity: payload.lightIntensity ?? payload.light ?? payload.ldr ?? undefined,
        pumpStatus: (typeof payload.pump === 'string') ? (payload.pump.toUpperCase() === 'ON' ? 'ON' : 'OFF') : undefined,
        waterLevel: payload.waterLevel ?? undefined,
        mode: payload.mode ? String(payload.mode).toUpperCase() : undefined,
        valve: asBool(payload.valve),
        bulb: asBool(payload.bulb),
        fan: asBool(payload.fan),
        heater: asBool(payload.heater),
        buzzer: asBool(payload.buzzer),
        status: payload.status ?? payload.deviceStatus ?? undefined,
        timestamp: payload.timestamp || Date.now(),
      };
      // Remove undefined fields as Firebase RTDB rejects them
      Object.keys(normalized).forEach((k) => {
        if (normalized[k] === undefined) delete normalized[k];
      });
      db.ref(`devices/${deviceId}/data`).push(normalized);
    } catch (e) {
      console.error('[mqttFirebaseBridge] Invalid message', e.message);
    }
  });
  client.on('error', (e) => console.error('[mqttFirebaseBridge] error', e && (e.stack || e.message || e)));
  started = true;
}




