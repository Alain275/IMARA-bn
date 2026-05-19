import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';

export async function listCourses(req, res) {
  const { q, tag, category } = req.query;
  const wh = {};
  if (q) wh.title = { $regex: q, $options: 'i' };
  if (tag) wh.tags = { $in: [tag] };
  if (category) wh.categories = { $in: [category] };
  const items = await Course.find(wh).sort({ createdAt: -1 }).lean();
  res.json(items);
}

export async function createCourse(req, res) {
  const { title, description, categories, tags, level, url, coverImage, contentHtml } = req.body;
  const c = await Course.create({ title, description, categories, tags, level, url, coverImage, contentHtml, trainerUserId: req.user?.id });
  res.status(201).json(c);
}

export async function enroll(req, res) {
  const { courseId } = req.body;
  try {
    const e = await Enrollment.create({ courseId, studentUserId: req.user.id, progress: 0 });
    res.status(201).json(e);
  } catch (e) {
    res.status(400).json({ error: 'Enroll failed', details: e.message });
  }
}

export async function myEnrollments(req, res) {
  const rows = await Enrollment.find({ studentUserId: req.user.id }).populate('courseId').lean();
  res.json(rows.map(r => ({ id: r._id, progress: r.progress, course: r.courseId })));
}

export async function devSeedCourses(_req, res) {
  const samples = [
    { title: 'IoT Basics for Smart Farming', description: 'Understand sensors, microcontrollers (ESP8266/ESP32), MQTT, and cloud integration.', categories: ['IoT'], tags: ['ESP8266','MQTT','Sensors'], coverImage: '/assets/monitoring.jpg', contentHtml: '<p>In this course, you will wire a DHT11 and soil probe to an ESP8266, publish to MQTT, and visualize data.</p><ul><li>Hardware setup</li><li>Firmware</li><li>MQTT topics</li><li>Cloud bridge</li></ul>' },
    { title: 'Smart Irrigation with Soil Moisture', description: 'Design and implement moisture-based irrigation with pumps and relays.', categories: ['Irrigation'], tags: ['Soil Moisture','Relay','Pump'], coverImage: '/assets/irrigation.jpg', contentHtml: '<p>Automate irrigation using moisture thresholds and time windows, with safety interlocks.</p>' },
    { title: 'Edge to Cloud: MQTT + Firebase', description: 'Bridge MQTT telemetry to Firebase for realtime dashboards.', categories: ['Cloud'], tags: ['Firebase','MQTT','Realtime'], coverImage: '/assets/analytics.jpg', contentHtml: '<p>Configure HiveMQ Cloud and Firebase RTDB, then implement a Node.js bridge.</p>' },
    { title: 'AI for Crop Health', description: 'Use ML to predict irrigation needs and detect anomalies.', categories: ['AI/ML'], tags: ['ML','Prediction'], coverImage: '/assets/learning.jpg', contentHtml: '<p>Build simple baselines, then graduate to ML predictions for irrigation and disease detection.</p>' },
    { title: 'React Dashboards for IoT', description: 'Build responsive, realtime dashboards with charts and maps.', categories: ['Frontend'], tags: ['React','Charts'], coverImage: '/assets/vision.jpg', contentHtml: '<p>Use charts, cards and realtime hooks to render sensor data with React and Tailwind.</p>' },
  ];
  for (const s of samples) {
    const exists = await Course.findOne({ title: s.title });
    if (!exists) await Course.create(s);
  }
  const all = await Course.find().sort({ createdAt: -1 }).lean();
  res.json({ seeded: true, total: all.length });
}

export async function getCourse(req, res) {
  const { id } = req.params;
  const c = await Course.findById(id).lean();
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json(c);
}

export async function updateCourse(req, res) {
  const { id } = req.params;
  console.log('📚 Updating course:', id);
  console.log('📦 Request body:', req.body);
  
  const patch = (({ title, description, categories, tags, level, url, coverImage, contentHtml }) => ({ 
    title, 
    description, 
    categories, 
    tags, 
    level, 
    url, 
    coverImage, 
    contentHtml 
  }))(req.body);
  
  console.log('🔧 Patch to apply:', patch);
  console.log('📝 Content HTML length:', patch.contentHtml?.length || 0);
  console.log('🖼️ Cover image:', patch.coverImage || 'none');
  
  const c = await Course.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).lean();
  if (!c) return res.status(404).json({ error: 'Not found' });
  
  console.log('✅ Course updated successfully');
  console.log('📄 Updated content HTML length:', c.contentHtml?.length || 0);
  console.log('🖼️ Updated cover image:', c.coverImage || 'none');
  
  res.json(c);
}

export async function deleteCourse(req, res) {
  const { id } = req.params;
  const c = await Course.findByIdAndDelete(id).lean();
  if (!c) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
}

