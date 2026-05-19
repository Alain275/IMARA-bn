import mqtt from 'mqtt';
import { SensorData } from '../models/SensorData.js';

let client;
function asBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') return ['true', '1', 'on'].includes(v.toLowerCase());
  return undefined;
}

function resolveMqttUrl() {
  if (process.env.MQTT_URL) return process.env.MQTT_URL;
  const host = process.env.MQTT_HOST || 'localhost';
  const port = Number(process.env.MQTT_PORT || 1883);
  const secure = String(process.env.MQTT_SECURE || '').toLowerCase() === 'true' || port === 8883;
  return `${secure ? 'mqtts' : 'mqtt'}://${host}:${port}`;
}

export async function connectMqtt() {
  const url = resolveMqttUrl();
  const isTls = url.startsWith('mqtts://');
  client = mqtt.connect(url, {
    reconnectPeriod: 2000,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    rejectUnauthorized: false,
    protocol: isTls ? 'mqtts' : 'mqtt'
  });
  client.on('connect', () => {
    // eslint-disable-next-line no-console
    console.log('Connected to MQTT');
    // Subscribe to device data topics (both with and without leading slash)
    client.subscribe('smartfarmx/device/+/data');
    client.subscribe('/smartfarmx/device/+/data');
  });
  client.on('message', async (topic, message) => {
    try {
      const raw = JSON.parse(message.toString());
      // Normalize incoming payload keys from firmware
      const normalized = {
        deviceId: raw.deviceId || raw.device_id || undefined,
        temperature: raw.temperature ?? raw.temp ?? undefined,
        humidity: raw.humidity ?? raw.hum ?? undefined,
        soilMoisture: (raw.soilMoisture ?? raw.soil ?? raw.soil_pct ?? undefined),
        lightIntensity: raw.lightIntensity ?? raw.light ?? raw.ldr ?? undefined,
        waterLevel: raw.waterLevel ?? undefined,
        mode: raw.mode ? String(raw.mode).toUpperCase() : undefined,
        pumpStatus: (typeof raw.pump === 'string') ? (raw.pump.toUpperCase() === 'ON' ? 'ON' : 'OFF') : undefined,
        valve: asBool(raw.valve),
        bulb: asBool(raw.bulb),
        fan: asBool(raw.fan),
        heater: asBool(raw.heater),
        buzzer: asBool(raw.buzzer),
        status: raw.status ?? raw.deviceStatus ?? undefined,
        timestamp: raw.timestamp ? new Date(raw.timestamp) : new Date()
      };
      // Fallback deviceId from topic
      if (!normalized.deviceId) {
        const parts = topic.split('/').filter(Boolean);
        const idx = parts.indexOf('device');
        if (idx >= 0 && parts[idx + 1]) normalized.deviceId = parts[idx + 1];
      }
      if (!normalized.deviceId) return; // cannot store without deviceId
      await SensorData.create(normalized);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('MQTT message handling error', e);
    }
  });
  client.on('error', (e) => {
    // eslint-disable-next-line no-console
    console.error('[mqttService] error', e && (e.stack || e.message || e));
  });
}

export function getMqttClient() {
  return client;
}




