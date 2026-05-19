import { SensorData } from '../models/SensorData.js';
import { Sensor } from '../models/Sensor.js';
import { getFirebaseDb } from '../services/firebaseAdmin.js';
import { toUserObjectId } from '../utils/mongoIds.js';
import { buildAiSummaryPayload } from '../../../ai-services/reports/reportIntelligence.js';

const DEFAULT_GREENHOUSE_DEVICE = 'greenhouse_01';

async function readGreenhouseRowsFromFirebase(limit = 300) {
  const db = getFirebaseDb();
  if (!db) return [];
  const logsSnap = await db.ref('/greenhouse/logs').limitToLast(Number(limit)).get();
  const rows = Object.values(logsSnap.val() || {});
  return rows.map((row) => ({
    deviceId: DEFAULT_GREENHOUSE_DEVICE,
    temperature: row.temperature ?? row.temp ?? null,
    humidity: row.humidity ?? row.hum ?? null,
    soilMoisture: row.soilMoisture ?? row.soil ?? null,
    lightIntensity: row.lightIntensity ?? row.light ?? row.lux ?? null,
    waterLevel: row.waterLevel ?? row.water_level ?? null,
    timestamp: row.timestamp ? new Date(Number(row.timestamp) * 1000) : new Date(),
  }));
}

export async function kpis(req, res) {
  try {
    const { deviceId, hours = 24 } = req.query;
    // Resource-level authorization: non-admin must own/authorized for device when deviceId provided.
    if (deviceId && req.user?.role !== 'admin') {
      const ok = await Sensor.findOne({
        deviceId,
        $or: [{ ownerUserId: toUserObjectId(req.user.id) }, { authorizedUserIds: toUserObjectId(req.user.id) }],
      }).lean();
      if (!ok) return res.status(403).json({ error: 'Forbidden' });
    }
    const now = Date.now();
    const from = new Date(now - Number(hours) * 3600 * 1000);
    const match = { timestamp: { $gte: from } };
    if (deviceId) match.deviceId = deviceId;
    const agg = await SensorData.aggregate([
      { $match: match },
      { $group: {
          _id: null,
          count: { $sum: 1 },
          tempAvg: { $avg: '$temperature' },
          humidityAvg: { $avg: '$humidity' },
          soilAvg: { $avg: '$soilMoisture' },
          waterAvg: { $avg: '$waterLevel' }
      } }
    ]);
    let data = agg[0] || null;
    if (!data && (!deviceId || deviceId === DEFAULT_GREENHOUSE_DEVICE)) {
      const fbRows = await readGreenhouseRowsFromFirebase(Math.max(120, Number(hours) * 5));
      const vals = fbRows.filter((r) => r.timestamp >= from);
      const avg = (list, key) => {
        const a = list.map((x) => x[key]).filter((v) => v != null);
        return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
      };
      data = {
        count: vals.length,
        tempAvg: avg(vals, 'temperature'),
        humidityAvg: avg(vals, 'humidity'),
        soilAvg: avg(vals, 'soilMoisture'),
        waterAvg: avg(vals, 'waterLevel'),
      };
    }
    data = data || { count: 0 };
    res.json({
      readings: data.count || 0,
      temperatureAvg: round(data.tempAvg),
      humidityAvg: round(data.humidityAvg),
      soilMoistureAvg: round(data.soilAvg),
      waterLevelAvg: round(data.waterAvg)
    });
  } catch (e) {
    res.status(400).json({ error: 'KPIs failed', details: e.message });
  }
}

export async function kpisPublic(req, res) {
  try {
    const { deviceId, hours = 24 } = req.query;
    const now = Date.now();
    const from = new Date(now - Number(hours) * 3600 * 1000);
    const match = { timestamp: { $gte: from } };
    if (deviceId) match.deviceId = deviceId;
    const agg = await SensorData.aggregate([
      { $match: match },
      { $group: {
          _id: null,
          count: { $sum: 1 },
          tempAvg: { $avg: '$temperature' },
          humidityAvg: { $avg: '$humidity' },
          soilAvg: { $avg: '$soilMoisture' },
          waterAvg: { $avg: '$waterLevel' }
      } }
    ]);
    let data = agg[0] || null;
    if (!data && (!deviceId || deviceId === DEFAULT_GREENHOUSE_DEVICE)) {
      const fbRows = await readGreenhouseRowsFromFirebase(Math.max(120, Number(hours) * 5));
      const vals = fbRows.filter((r) => r.timestamp >= from);
      const avg = (list, key) => {
        const a = list.map((x) => x[key]).filter((v) => v != null);
        return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
      };
      data = {
        count: vals.length,
        tempAvg: avg(vals, 'temperature'),
        humidityAvg: avg(vals, 'humidity'),
        soilAvg: avg(vals, 'soilMoisture'),
        waterAvg: avg(vals, 'waterLevel'),
      };
    }
    data = data || { count: 0 };
    res.json({
      readings: data.count || 0,
      temperatureAvg: round(data.tempAvg),
      humidityAvg: round(data.humidityAvg),
      soilMoistureAvg: round(data.soilAvg),
      waterLevelAvg: round(data.waterAvg)
    });
  } catch (e) {
    res.status(400).json({ error: 'KPIs public failed', details: e.message });
  }
}

export async function sensorCsv(req, res) {
  try {
    const { deviceId, from, to } = req.query;
    if (!deviceId) return res.status(400).send('deviceId is required');
    if (req.user?.role !== 'admin') {
      const ok = await Sensor.findOne({
        deviceId,
        $or: [{ ownerUserId: toUserObjectId(req.user.id) }, { authorizedUserIds: toUserObjectId(req.user.id) }],
      }).lean();
      if (!ok) return res.status(403).json({ error: 'Forbidden' });
    }
    const query = { deviceId };
    if (from) query.timestamp = { ...(query.timestamp||{}), $gte: new Date(from) };
    if (to) query.timestamp = { ...(query.timestamp||{}), $lte: new Date(to) };
    let rows = await SensorData.find(query).sort({ timestamp: 1 }).lean();
    if ((!rows || rows.length === 0) && deviceId === DEFAULT_GREENHOUSE_DEVICE) {
      rows = await readGreenhouseRowsFromFirebase(500);
    }
    const header = 'timestamp,temperature,humidity,soilMoisture,waterLevel\n';
    const body = rows.map(r => [
      new Date(r.timestamp).toISOString(),
      safe(r.temperature),
      safe(r.humidity),
      safe(r.soilMoisture),
      safe(r.waterLevel)
    ].join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${deviceId}-sensor-data.csv"`);
    res.send(header + body);
  } catch (e) {
    res.status(400).json({ error: 'CSV export failed', details: e.message });
  }
}

export async function sensorCsvPublic(req, res) {
  try {
    const { deviceId, from, to } = req.query;
    if (!deviceId) return res.status(400).send('deviceId is required');
    const query = { deviceId };
    if (from) query.timestamp = { ...(query.timestamp||{}), $gte: new Date(from) };
    if (to) query.timestamp = { ...(query.timestamp||{}), $lte: new Date(to) };
    let rows = await SensorData.find(query).sort({ timestamp: 1 }).lean();
    if ((!rows || rows.length === 0) && deviceId === DEFAULT_GREENHOUSE_DEVICE) {
      rows = await readGreenhouseRowsFromFirebase(500);
    }
    const header = 'timestamp,temperature,humidity,soilMoisture,waterLevel\n';
    const body = rows.map(r => [
      new Date(r.timestamp).toISOString(),
      safe(r.temperature),
      safe(r.humidity),
      safe(r.soilMoisture),
      safe(r.waterLevel)
    ].join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${deviceId}-sensor-data.csv"`);
    res.send(header + body);
  } catch (e) {
    res.status(400).json({ error: 'CSV export public failed', details: e.message });
  }
}

function round(v) { return v != null ? Math.round(v * 10) / 10 : null; }
function safe(v) { return v == null ? '' : v; }

export async function aiSummary(req, res) {
  try {
    const { deviceId, hours = 24 } = req.query;
    if (deviceId && req.user?.role !== 'admin') {
      const ok = await Sensor.findOne({
        deviceId,
        $or: [{ ownerUserId: toUserObjectId(req.user.id) }, { authorizedUserIds: toUserObjectId(req.user.id) }],
      }).lean();
      if (!ok) return res.status(403).json({ error: 'Forbidden' });
    }
    const now = Date.now();
    const from = new Date(now - Number(hours) * 3600 * 1000);
    const match = { timestamp: { $gte: from } };
    if (deviceId) match.deviceId = deviceId;
    let rows = await SensorData.find(match).sort({ timestamp: 1 }).lean();
    if ((!rows || rows.length === 0) && (!deviceId || deviceId === DEFAULT_GREENHOUSE_DEVICE)) {
      rows = await readGreenhouseRowsFromFirebase(Math.max(120, Number(hours) * 5));
    }
    res.json(buildAiSummaryPayload(rows, Number(hours), deviceId));
  } catch (e) {
    res.status(400).json({ error: 'AI summary failed', details: e.message });
  }
}

export async function aiSummaryPublic(req, res) {
  try {
    const { deviceId, hours = 24 } = req.query;
    const now = Date.now();
    const from = new Date(now - Number(hours) * 3600 * 1000);
    const match = { timestamp: { $gte: from } };
    if (deviceId) match.deviceId = deviceId;
    let rows = await SensorData.find(match).sort({ timestamp: 1 }).lean();
    if ((!rows || rows.length === 0) && (!deviceId || deviceId === DEFAULT_GREENHOUSE_DEVICE)) {
      rows = await readGreenhouseRowsFromFirebase(Math.max(120, Number(hours) * 5));
    }
    res.json(buildAiSummaryPayload(rows, Number(hours), deviceId));
  } catch (e) {
    res.status(400).json({ error: 'AI summary public failed', details: e.message });
  }
}

export async function aiDoc(req, res) {
  try {
    const { deviceId, hours = 24 } = req.query;
    if (deviceId && req.user?.role !== 'admin') {
      const ok = await Sensor.findOne({
        deviceId,
        $or: [{ ownerUserId: toUserObjectId(req.user.id) }, { authorizedUserIds: toUserObjectId(req.user.id) }],
      }).lean();
      if (!ok) return res.status(403).json({ error: 'Forbidden' });
    }
    const contentPromise = new Promise((resolve, reject) => {
      const resObj = { json: resolve, status: () => ({ json: reject }) };
      aiSummary({ query: { deviceId, hours } }, resObj);
    });
    const content = await contentPromise;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>SmartFarmX Agricultural Report</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; margin: 1in; }
    h1 { font-size: 18pt; font-weight: bold; text-align: center; margin-bottom: 0.5em; }
    h2 { font-size: 14pt; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em; border-bottom: 1px solid #000; }
    h3 { font-size: 12pt; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; }
    p { text-align: justify; margin-bottom: 1em; }
    table { width: 100%; border-collapse: collapse; margin: 1em 0; }
    th, td { border: 1px solid #000; padding: 8px; text-align: left; }
    th { background-color: #f0f0f0; font-weight: bold; }
    ul, ol { margin-left: 1.5em; margin-bottom: 1em; }
    li { margin-bottom: 0.5em; }
    .header { text-align: center; margin-bottom: 2em; }
    .footer { margin-top: 3em; font-size: 10pt; text-align: center; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>SmartFarmX Agricultural Monitoring Report</h1>
    <p><strong>Device ID:</strong> ${deviceId || 'All Devices'} | <strong>Report Period:</strong> ${hours} hours | <strong>Generated:</strong> ${dateStr}</p>
  </div>

  <h2>1. Executive Summary</h2>
  <p>${content.summary}</p>
  <p>This comprehensive report provides detailed insights into the agricultural monitoring data collected from IoT sensors deployed in the field. The analysis covers environmental conditions, soil health indicators, and actionable recommendations to optimize crop yield and resource utilization.</p>

  <h2>2. Key Performance Indicators (KPIs)</h2>
  <p>The following table presents the aggregated metrics collected during the monitoring period. These indicators provide a snapshot of the environmental conditions affecting crop growth and development.</p>
  <table>
    <thead>
      <tr><th>Metric</th><th>Value</th><th>Status</th></tr>
    </thead>
    <tbody>
      ${content.table.map(r => {
        let status = 'Normal';
        if (r.metric.includes('Soil Moisture')) {
          const val = parseFloat(r.value);
          if (val < 30) status = 'Low - Action Required';
          else if (val > 70) status = 'High - Monitor';
        } else if (r.metric.includes('Temperature')) {
          const val = parseFloat(r.value);
          if (val > 32) status = 'High - Risk';
          else if (val < 15) status = 'Low - Risk';
        }
        return `<tr><td>${r.metric}</td><td>${r.value ?? 'N/A'}</td><td>${status}</td></tr>`;
      }).join('')}
    </tbody>
  </table>

  <h2>3. Detailed Environmental Analysis</h2>
  
  <h3>3.1 Soil Moisture Analysis</h3>
  <p>Soil moisture is a critical factor in determining irrigation schedules and ensuring optimal water availability for crops. The average soil moisture level of ${content.table[0]?.value ?? 'N/A'}% indicates ${parseFloat(content.table[0]?.value) < 30 ? 'insufficient water content, requiring immediate irrigation intervention' : parseFloat(content.table[0]?.value) > 70 ? 'adequate to high moisture levels, suggesting good water retention' : 'moderate moisture levels suitable for most crop types'}.</p>
  <p>Maintaining optimal soil moisture (typically 40-60% for most crops) is essential for:</p>
  <ul>
    <li>Nutrient uptake and transport within plant systems</li>
    <li>Root development and expansion</li>
    <li>Prevention of water stress and wilting</li>
    <li>Optimal photosynthesis and metabolic processes</li>
  </ul>

  <h3>3.2 Temperature Conditions</h3>
  <p>The recorded average temperature of ${content.table[1]?.value ?? 'N/A'}°C ${parseFloat(content.table[1]?.value) > 30 ? 'exceeds the optimal range for most crops, potentially causing heat stress and increased evapotranspiration' : parseFloat(content.table[1]?.value) < 18 ? 'is below optimal levels, which may slow growth and development' : 'falls within the acceptable range for healthy crop development'}.</p>
  <p>Temperature impacts several critical agricultural factors:</p>
  <ul>
    <li>Enzyme activity and metabolic rates in plants</li>
    <li>Evapotranspiration rates and water demand</li>
    <li>Pest and disease prevalence</li>
    <li>Flowering and fruit set timing</li>
  </ul>

  <h3>3.3 Humidity Assessment</h3>
  <p>Relative humidity levels averaging ${content.table[2]?.value ?? 'N/A'}% play a significant role in plant health and disease management. ${parseFloat(content.table[2]?.value) > 70 ? 'High humidity levels increase the risk of fungal diseases and may require improved ventilation or fungicide applications' : parseFloat(content.table[2]?.value) < 40 ? 'Low humidity can lead to increased water stress and may benefit from misting or irrigation adjustments' : 'Current humidity levels are within acceptable parameters'}.</p>

  <h2>4. Predictive Forecast</h2>
  <p>Based on current trends and historical data patterns, the following projections are made for the immediate future:</p>
  <table>
    <thead>
      <tr><th>Parameter</th><th>Projected Value</th><th>Confidence</th></tr>
    </thead>
    <tbody>
      ${content.forecast.map(r => `<tr><td>${r.metric}</td><td>${r.value ?? 'N/A'}</td><td>Moderate</td></tr>`).join('')}
    </tbody>
  </table>
  <p>These forecasts are generated using statistical analysis of recent sensor data and should be used as guidance for short-term planning. Actual conditions may vary based on weather patterns and other environmental factors.</p>

  <h2>5. Actionable Recommendations</h2>
  <p>Based on the comprehensive analysis of collected data, the following recommendations are provided to optimize agricultural operations:</p>
  <ol>
    ${content.recommendations.map(x => `<li><strong>${x}</strong></li>`).join('')}
    <li><strong>Regular Monitoring:</strong> Continue systematic data collection to identify trends and respond proactively to changing conditions.</li>
    <li><strong>Data-Driven Decision Making:</strong> Utilize the insights from this report to inform irrigation scheduling, fertilization timing, and pest management strategies.</li>
    <li><strong>Equipment Maintenance:</strong> Ensure all sensors and irrigation systems are functioning properly to maintain data accuracy and operational efficiency.</li>
  </ol>

  <h2>6. Best Practices for Smart Agriculture</h2>
  <p>To maximize the benefits of IoT-enabled precision agriculture, consider implementing the following best practices:</p>
  <ul>
    <li><strong>Integrated Pest Management (IPM):</strong> Use environmental data to predict pest pressure and apply targeted interventions.</li>
    <li><strong>Variable Rate Application:</strong> Adjust inputs (water, fertilizer) based on spatial and temporal variability in field conditions.</li>
    <li><strong>Soil Health Management:</strong> Monitor organic matter content, pH levels, and nutrient availability alongside moisture data.</li>
    <li><strong>Water Conservation:</strong> Implement deficit irrigation strategies during non-critical growth stages to conserve water resources.</li>
    <li><strong>Climate Adaptation:</strong> Use historical trends to adapt planting schedules and variety selection to changing climate patterns.</li>
  </ul>

  <h2>7. Conclusion</h2>
  <p>This report demonstrates the value of continuous environmental monitoring in modern agriculture. By leveraging real-time data from IoT sensors, farmers can make informed decisions that improve crop yields, reduce resource waste, and enhance sustainability. The SmartFarmX platform provides the tools necessary to transition from reactive to proactive farm management.</p>
  <p>Regular review of these reports, combined with field observations and agronomic expertise, will enable optimal resource allocation and improved agricultural outcomes. For questions or technical support, please contact the SmartFarmX support team.</p>

  <div class="footer">
    <p>© ${now.getFullYear()} SmartFarmX - Precision Agriculture Solutions</p>
    <p>This report is generated automatically based on sensor data and statistical analysis. Always consult with agricultural experts for critical decisions.</p>
  </div>
</body>
</html>`;
    res.setHeader('Content-Type', 'application/msword');
    res.setHeader('Content-Disposition', `attachment; filename="smartfarmx-report-${deviceId || 'all'}.doc"`);
    res.send(html);
  } catch (e) {
    res.status(400).json({ error: 'AI doc generation failed', details: e.message });
  }
}

export async function aiPdf(req, res) {
  try {
    const { createEnhancedPdfReport } = await import('../services/enhancedPdfService.js');
    
    const { deviceId, hours = 168 } = req.query; // Default to 7 days for more data
    if (deviceId && req.user?.role !== 'admin') {
      const ok = await Sensor.findOne({
        deviceId,
        $or: [{ ownerUserId: toUserObjectId(req.user.id) }, { authorizedUserIds: toUserObjectId(req.user.id) }],
      }).lean();
      if (!ok) return res.status(403).json({ error: 'Forbidden' });
    }
    const now = Date.now();
    const from = new Date(now - Number(hours) * 3600 * 1000);
    const match = { timestamp: { $gte: from } };
    if (deviceId) match.deviceId = deviceId;
    
    // Fetch sensor data
    const data = await SensorData.find(match).sort({ timestamp: 1 }).lean();
    
    if (data.length === 0) {
      return res.status(404).json({ 
        error: 'No data available', 
        message: 'No sensor data found for the specified period. Please ensure devices are connected and sending data.' 
      });
    }
    
    // Calculate comprehensive KPIs
    const temps = data.map(d => d.temperature).filter(v => v != null);
    const humids = data.map(d => d.humidity).filter(v => v != null);
    const soils = data.map(d => d.soilMoisture).filter(v => v != null);
    const waters = data.map(d => d.waterLevel).filter(v => v != null);
    const pumps = data.filter(d => d.pumpStatus === 'ON');
    
    const avg = arr => arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : null;
    const min = arr => arr.length ? Math.min(...arr) : null;
    const max = arr => arr.length ? Math.max(...arr) : null;
    
    const kpis = {
      avgTemperature: round(avg(temps)),
      minTemperature: round(min(temps)),
      maxTemperature: round(max(temps)),
      avgHumidity: round(avg(humids)),
      minHumidity: round(min(humids)),
      maxHumidity: round(max(humids)),
      avgSoilMoisture: round(avg(soils)),
      minSoilMoisture: round(min(soils)),
      maxSoilMoisture: round(max(soils)),
      avgWaterLevel: round(avg(waters)),
      minWaterLevel: round(min(waters)),
      maxWaterLevel: round(max(waters)),
      irrigationEvents: pumps.length,
      totalReadings: data.length
    };
    
    // Generate enhanced PDF
    const pdfBuffer = await createEnhancedPdfReport(deviceId || 'All Devices', data, kpis, {
      period: `Last ${hours} hours`
    });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="smartfarmx-detailed-report-${deviceId || 'all'}.pdf"`);
    res.send(pdfBuffer);
  } catch (e) {
    console.error('PDF generation error:', e);
    res.status(400).json({ error: 'AI pdf generation failed', details: e.message });
  }
}

export async function aiDocPublic(req, res) {
  try {
    const { deviceId, hours = 24 } = req.query;
    const contentPromise = new Promise((resolve, reject) => {
      const resObj = { json: resolve, status: () => ({ json: reject }) };
      aiSummaryPublic({ query: { deviceId, hours } }, resObj);
    });
    const content = await contentPromise;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>SmartFarmX Agricultural Report</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; margin: 1in; }
    h1 { font-size: 18pt; font-weight: bold; text-align: center; margin-bottom: 0.5em; }
    h2 { font-size: 14pt; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em; border-bottom: 1px solid #000; }
    h3 { font-size: 12pt; font-weight: bold; margin-top: 1em; margin-bottom: 0.5em; }
    p { text-align: justify; margin-bottom: 1em; }
    table { width: 100%; border-collapse: collapse; margin: 1em 0; }
    th, td { border: 1px solid #000; padding: 8px; text-align: left; }
    th { background-color: #f0f0f0; font-weight: bold; }
    ul, ol { margin-left: 1.5em; margin-bottom: 1em; }
    li { margin-bottom: 0.5em; }
    .header { text-align: center; margin-bottom: 2em; }
    .footer { margin-top: 3em; font-size: 10pt; text-align: center; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>SmartFarmX Agricultural Monitoring Report</h1>
    <p><strong>Device ID:</strong> ${deviceId || 'All Devices'} | <strong>Report Period:</strong> ${hours} hours | <strong>Generated:</strong> ${dateStr}</p>
  </div>

  <h2>1. Executive Summary</h2>
  <p>${content.summary}</p>
  <p>This comprehensive report provides detailed insights into the agricultural monitoring data collected from IoT sensors deployed in the field. The analysis covers environmental conditions, soil health indicators, and actionable recommendations to optimize crop yield and resource utilization.</p>

  <h2>2. Key Performance Indicators (KPIs)</h2>
  <p>The following table presents the aggregated metrics collected during the monitoring period. These indicators provide a snapshot of the environmental conditions affecting crop growth and development.</p>
  <table>
    <thead>
      <tr><th>Metric</th><th>Value</th><th>Status</th></tr>
    </thead>
    <tbody>
      ${content.table.map(r => {
        let status = 'Normal';
        if (r.metric.includes('Soil Moisture')) {
          const val = parseFloat(r.value);
          if (val < 30) status = 'Low - Action Required';
          else if (val > 70) status = 'High - Monitor';
        } else if (r.metric.includes('Temperature')) {
          const val = parseFloat(r.value);
          if (val > 32) status = 'High - Risk';
          else if (val < 15) status = 'Low - Risk';
        }
        return `<tr><td>${r.metric}</td><td>${r.value ?? 'N/A'}</td><td>${status}</td></tr>`;
      }).join('')}
    </tbody>
  </table>

  <h2>3. Detailed Environmental Analysis</h2>
  
  <h3>3.1 Soil Moisture Analysis</h3>
  <p>Soil moisture is a critical factor in determining irrigation schedules and ensuring optimal water availability for crops. The average soil moisture level of ${content.table[0]?.value ?? 'N/A'}% indicates ${parseFloat(content.table[0]?.value) < 30 ? 'insufficient water content, requiring immediate irrigation intervention' : parseFloat(content.table[0]?.value) > 70 ? 'adequate to high moisture levels, suggesting good water retention' : 'moderate moisture levels suitable for most crop types'}.</p>
  <p>Maintaining optimal soil moisture (typically 40-60% for most crops) is essential for:</p>
  <ul>
    <li>Nutrient uptake and transport within plant systems</li>
    <li>Root development and expansion</li>
    <li>Prevention of water stress and wilting</li>
    <li>Optimal photosynthesis and metabolic processes</li>
  </ul>

  <h3>3.2 Temperature Conditions</h3>
  <p>The recorded average temperature of ${content.table[1]?.value ?? 'N/A'}°C ${parseFloat(content.table[1]?.value) > 30 ? 'exceeds the optimal range for most crops, potentially causing heat stress and increased evapotranspiration' : parseFloat(content.table[1]?.value) < 18 ? 'is below optimal levels, which may slow growth and development' : 'falls within the acceptable range for healthy crop development'}.</p>
  <p>Temperature impacts several critical agricultural factors:</p>
  <ul>
    <li>Enzyme activity and metabolic rates in plants</li>
    <li>Evapotranspiration rates and water demand</li>
    <li>Pest and disease prevalence</li>
    <li>Flowering and fruit set timing</li>
  </ul>

  <h3>3.3 Humidity Assessment</h3>
  <p>Relative humidity levels averaging ${content.table[2]?.value ?? 'N/A'}% play a significant role in plant health and disease management. ${parseFloat(content.table[2]?.value) > 70 ? 'High humidity levels increase the risk of fungal diseases and may require improved ventilation or fungicide applications' : parseFloat(content.table[2]?.value) < 40 ? 'Low humidity can lead to increased water stress and may benefit from misting or irrigation adjustments' : 'Current humidity levels are within acceptable parameters'}.</p>

  <h2>4. Predictive Forecast</h2>
  <p>Based on current trends and historical data patterns, the following projections are made for the immediate future:</p>
  <table>
    <thead>
      <tr><th>Parameter</th><th>Projected Value</th><th>Confidence</th></tr>
    </thead>
    <tbody>
      ${content.forecast.map(r => `<tr><td>${r.metric}</td><td>${r.value ?? 'N/A'}</td><td>Moderate</td></tr>`).join('')}
    </tbody>
  </table>
  <p>These forecasts are generated using statistical analysis of recent sensor data and should be used as guidance for short-term planning. Actual conditions may vary based on weather patterns and other environmental factors.</p>

  <h2>5. Actionable Recommendations</h2>
  <p>Based on the comprehensive analysis of collected data, the following recommendations are provided to optimize agricultural operations:</p>
  <ol>
    ${content.recommendations.map(x => `<li><strong>${x}</strong></li>`).join('')}
    <li><strong>Regular Monitoring:</strong> Continue systematic data collection to identify trends and respond proactively to changing conditions.</li>
    <li><strong>Data-Driven Decision Making:</strong> Utilize the insights from this report to inform irrigation scheduling, fertilization timing, and pest management strategies.</li>
    <li><strong>Equipment Maintenance:</strong> Ensure all sensors and irrigation systems are functioning properly to maintain data accuracy and operational efficiency.</li>
  </ol>

  <h2>6. Best Practices for Smart Agriculture</h2>
  <p>To maximize the benefits of IoT-enabled precision agriculture, consider implementing the following best practices:</p>
  <ul>
    <li><strong>Integrated Pest Management (IPM):</strong> Use environmental data to predict pest pressure and apply targeted interventions.</li>
    <li><strong>Variable Rate Application:</strong> Adjust inputs (water, fertilizer) based on spatial and temporal variability in field conditions.</li>
    <li><strong>Soil Health Management:</strong> Monitor organic matter content, pH levels, and nutrient availability alongside moisture data.</li>
    <li><strong>Water Conservation:</strong> Implement deficit irrigation strategies during non-critical growth stages to conserve water resources.</li>
    <li><strong>Climate Adaptation:</strong> Use historical trends to adapt planting schedules and variety selection to changing climate patterns.</li>
  </ul>

  <h2>7. Conclusion</h2>
  <p>This report demonstrates the value of continuous environmental monitoring in modern agriculture. By leveraging real-time data from IoT sensors, farmers can make informed decisions that improve crop yields, reduce resource waste, and enhance sustainability. The SmartFarmX platform provides the tools necessary to transition from reactive to proactive farm management.</p>
  <p>Regular review of these reports, combined with field observations and agronomic expertise, will enable optimal resource allocation and improved agricultural outcomes. For questions or technical support, please contact the SmartFarmX support team.</p>

  <div class="footer">
    <p>© ${now.getFullYear()} SmartFarmX - Precision Agriculture Solutions</p>
    <p>This report is generated automatically based on sensor data and statistical analysis. Always consult with agricultural experts for critical decisions.</p>
  </div>
</body>
</html>`;
    res.setHeader('Content-Type', 'application/msword');
    res.setHeader('Content-Disposition', `attachment; filename="smartfarmx-report-${deviceId || 'all'}.doc"`);
    res.send(html);
  } catch (e) {
    res.status(400).json({ error: 'AI doc public failed', details: e.message });
  }
}

export async function aiPdfPublic(req, res) {
  try {
    const { createEnhancedPdfReport } = await import('../services/enhancedPdfService.js');
    
    const { deviceId, hours = 168 } = req.query; // Default to 7 days
    
    if (!deviceId) {
      return res.status(400).json({ 
        error: 'Device ID required', 
        message: 'Please provide a deviceId parameter' 
      });
    }
    
    const now = Date.now();
    const from = new Date(now - Number(hours) * 3600 * 1000);
    const match = { deviceId, timestamp: { $gte: from } };
    
    // Fetch sensor data
    const data = await SensorData.find(match).sort({ timestamp: 1 }).lean();
    
    if (data.length === 0) {
      return res.status(404).json({ 
        error: 'No data available', 
        message: `No sensor data found for device ${deviceId} in the last ${hours} hours. Please ensure the device is active and sending data.` 
      });
    }
    
    // Calculate comprehensive KPIs
    const temps = data.map(d => d.temperature).filter(v => v != null);
    const humids = data.map(d => d.humidity).filter(v => v != null);
    const soils = data.map(d => d.soilMoisture).filter(v => v != null);
    const waters = data.map(d => d.waterLevel).filter(v => v != null);
    const pumps = data.filter(d => d.pumpStatus === 'ON');
    
    const avg = arr => arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : null;
    const min = arr => arr.length ? Math.min(...arr) : null;
    const max = arr => arr.length ? Math.max(...arr) : null;
    
    const kpis = {
      avgTemperature: round(avg(temps)),
      minTemperature: round(min(temps)),
      maxTemperature: round(max(temps)),
      avgHumidity: round(avg(humids)),
      minHumidity: round(min(humids)),
      maxHumidity: round(max(humids)),
      avgSoilMoisture: round(avg(soils)),
      minSoilMoisture: round(min(soils)),
      maxSoilMoisture: round(max(soils)),
      avgWaterLevel: round(avg(waters)),
      minWaterLevel: round(min(waters)),
      maxWaterLevel: round(max(waters)),
      irrigationEvents: pumps.length,
      totalReadings: data.length
    };
    
    // Generate enhanced PDF
    const pdfBuffer = await createEnhancedPdfReport(deviceId, data, kpis, {
      period: `Last ${hours} hours`
    });
    
    // Set CORS headers explicitly for this endpoint
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="smartfarmx-detailed-report-${deviceId}.pdf"`);
    res.send(pdfBuffer);
  } catch (e) {
    console.error('Public PDF generation error:', e);
    res.status(400).json({ error: 'AI pdf public failed', details: e.message });
  }
}

