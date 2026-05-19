import { SensorData } from '../models/SensorData.js';
import { getFirebaseDb } from '../services/firebaseAdmin.js';
import {
  buildGreenhouseKpis,
  detectGreenhouseAnomalies,
  buildGreenhouseRecommendations,
} from '../../../ai-services/insights/greenhouseIntelligence.js';

const DEFAULT_DEVICE = 'greenhouse_01';

async function firebaseRows(limit = 240) {
  const db = getFirebaseDb();
  if (!db) return [];
  const snap = await db.ref('/greenhouse/logs').limitToLast(Number(limit)).get();
  const rows = Object.values(snap.val() || {});
  return rows.map((r) => {
    let tsMs = null;
    if (r.timestamp != null && r.timestamp !== '') {
      const n = Number(r.timestamp);
      if (!Number.isNaN(n)) {
        tsMs = n >= 1e12 ? n : n >= 946684800 ? n * 1000 : null;
      }
    }
    const timestamp = tsMs != null ? new Date(tsMs) : new Date();
    return {
      deviceId: DEFAULT_DEVICE,
      temperature: r.temperature ?? r.temp ?? null,
      humidity: r.humidity ?? r.hum ?? null,
      soilMoisture: r.soilMoisture ?? r.soil ?? null,
      lightIntensity: r.lightIntensity ?? r.light ?? r.lux ?? null,
      waterLevel: r.waterLevel ?? r.water_level ?? null,
      timestamp,
    };
  });
}

export async function greenhouseSummary(req, res) {
  try {
    const deviceId = String(req.deviceId || req.query.deviceId || DEFAULT_DEVICE);
    const hours = Number(req.query.hours || 24);
    const from = new Date(Date.now() - hours * 3600 * 1000);

    let rows = await SensorData.find({ deviceId, timestamp: { $gte: from } }).sort({ timestamp: 1 }).lean();
    if (!rows.length && deviceId === DEFAULT_DEVICE) {
      rows = (await firebaseRows(Math.max(120, hours * 5))).filter((r) => r.timestamp >= from);
    }

    const kpis = buildGreenhouseKpis(rows);
    const anomalies = detectGreenhouseAnomalies(kpis);
    const recommendations = buildGreenhouseRecommendations(kpis);

    return res.json({
      deviceId,
      hours,
      kpis,
      anomalies,
      recommendations,
      summary: `Device ${deviceId} reported ${kpis.readings} readings in the last ${hours}h.`,
    });
  } catch (e) {
    return res.status(400).json({ error: 'Intelligence summary failed', details: e.message });
  }
}

