import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { toUserObjectId } from '../utils/mongoIds.js';
import PDFDocument from 'pdfkit';
import { EmailTypes } from '../services/emailService.js';

export async function getMe(req, res) {
  try {
    const doc = await User.findById(req.user.id).lean();
    if (!doc) return res.status(404).json({ error: 'User not found' });
    const { _id, name, email, phone, role, avatarUrl, profile, farmInfo, devices } = doc;
    res.json({ user: { id: _id, name, email, phone, role, avatarUrl, profile, farmInfo, devices } });
  } catch (e) {
    res.status(400).json({ error: 'Failed to load profile', details: e.message });
  }
}

export async function updateMe(req, res) {
  try {
    const body = req.body;
    console.log('[updateMe] Received body keys:', Object.keys(body));
    const set = {};
    const unset = {};
    
    // Only process fields that are explicitly present in the request
    if ('name' in body) set.name = body.name;
    
    if ('email' in body) {
      const e = String(body.email || '').trim();
      if (e === '') unset.email = '';
      else set.email = e.toLowerCase();
    }
    
    if ('phone' in body) {
      const raw = String(body.phone || '').trim();
      const normalized = raw.replace(/\s+/g, ''); // remove spaces
      if (normalized === '') unset.phone = '';
      else set.phone = normalized;
    }
    if ('avatarUrl' in body) set.avatarUrl = body.avatarUrl;
    
    if ('profile' in body && body.profile) {
      set.profile = { ...body.profile };
    }
    
    if ('farmInfo' in body && body.farmInfo) {
      const mapped = { ...body.farmInfo };
      // map UI fields into structured
      if (body.farmInfo.farmSizeValue != null) mapped.farmSizeValue = Number(body.farmInfo.farmSizeValue);
      if (body.farmInfo.farmSizeUnit) mapped.farmSizeUnit = body.farmInfo.farmSizeUnit;
      if (body.farmInfo.type) mapped.type = body.farmInfo.type;
      set.farmInfo = mapped;
    }
    
    // compute completion percentage and merge into profile if profile is being updated
    const mergedProfile = set.profile || {};
    const fields = [set.name, set.email, set.phone, set.avatarUrl, mergedProfile?.address?.district, mergedProfile?.gender, set.farmInfo?.farmName];
    const filled = fields.filter(v => v != null && v !== '').length;
    const pct = Math.round((filled / fields.length) * 100) || 0;
    
    // If we're updating profile, merge completedPercentage into it to avoid path conflict
    if (set.profile) {
      set.profile.completedPercentage = pct;
    } else {
      // Only set as nested path if profile itself is not being updated
      set['profile.completedPercentage'] = pct;
    }

    // Uniqueness pre-checks to return friendly errors before attempting the write
    // Fetch current user once to compare values
    const currentUser = await User.findById(req.user.id).lean();
    if (!currentUser) return res.status(404).json({ error: 'User not found' });

    console.log('[updateMe] Current user email:', currentUser.email, 'New email:', set.email);
    console.log('[updateMe] Current user phone:', currentUser.phone, 'New phone:', set.phone);

    // Only check if the value is actually being changed
    if (set.email && currentUser.email !== set.email) {
      console.log('[updateMe] Checking email uniqueness for:', set.email);
      const exists = await User.findOne({ email: set.email, _id: { $ne: req.user.id } }).lean();
      if (exists) return res.status(409).json({ error: 'email already in use' });
    }
    if (set.phone && currentUser.phone !== set.phone) {
      console.log('[updateMe] Checking phone uniqueness for:', set.phone);
      const existsPh = await User.findOne({ phone: set.phone, _id: { $ne: req.user.id } }).lean();
      if (existsPh) return res.status(409).json({ error: 'phone already in use' });
    }

    const updateDoc = {};
    if (Object.keys(set).length) updateDoc.$set = set;
    if (Object.keys(unset).length) updateDoc.$unset = unset;

    console.log('[updateMe] Update document:', JSON.stringify(updateDoc, null, 2));

    const doc = await User.findByIdAndUpdate(
      req.user.id,
      updateDoc,
      { new: true, runValidators: true, context: 'query' }
    ).lean();
    if (!doc) return res.status(404).json({ error: 'User not found' });
    res.json({ id: doc._id, name: doc.name, email: doc.email, phone: doc.phone, role: doc.role, avatarUrl: doc.avatarUrl, profile: doc.profile, farmInfo: doc.farmInfo });
  } catch (e) {
    // handle duplicate key errors for unique fields
    console.error('[updateMe] Full error:', JSON.stringify(e, null, 2));
    console.error('[updateMe] Error code:', e.code);
    console.error('[updateMe] Error keyPattern:', e.keyPattern);
    console.error('[updateMe] Error keyValue:', e.keyValue);
    console.error('[updateMe] Error message:', e.message);
    
    if (e && (e.code === 11000 || e.name === 'MongoServerError')) {
      let key = 'field';
      if (e.keyPattern) key = Object.keys(e.keyPattern)[0];
      else if (e.keyValue) key = Object.keys(e.keyValue)[0];
      else if (typeof e.message === 'string') {
        if (e.message.includes('index: email_')) key = 'email';
        if (e.message.includes('index: phone_')) key = 'phone';
      }
      return res.status(409).json({ error: `${key} already in use`, details: e.message });
    }
    // eslint-disable-next-line no-console
    console.error('[updateMe] error', e && (e.stack || e));
    res.status(400).json({ error: 'Update failed', details: e.message });
  }
}

export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Current password incorrect' });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'Password change failed', details: e.message });
  }
}

// Send weekly report email to the authenticated user
export async function sendWeeklyReport(req, res) {
  try {
    const { SensorData } = await import('../models/SensorData.js');
    const { Sensor } = await import('../models/Sensor.js');
    const { createEnhancedPdfReport } = await import('../services/enhancedPdfService.js');
    
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Get user's devices
    const uid = toUserObjectId(req.user.id);
    const devices = await Sensor.find({
      $or: [{ ownerUserId: uid }, { authorizedUserIds: uid }],
    }).lean();
    
    if (devices.length === 0) {
      return res.status(400).json({ 
        error: 'No devices found', 
        message: 'Please add at least one device to receive weekly reports.' 
      });
    }
    
    // Fetch last 7 days of data
    const now = Date.now();
    const weekAgo = new Date(now - 7 * 24 * 3600 * 1000);
    const deviceIds = devices.map(d => d.deviceId);
    
    const data = await SensorData.find({
      deviceId: { $in: deviceIds },
      timestamp: { $gte: weekAgo }
    }).sort({ timestamp: 1 }).lean();
    
    if (data.length === 0) {
      return res.status(400).json({ 
        error: 'No data available', 
        message: 'No sensor data found for the past week. Please ensure your devices are active.' 
      });
    }
    
    // Calculate KPIs
    const temps = data.map(d => d.temperature).filter(v => v != null);
    const humids = data.map(d => d.humidity).filter(v => v != null);
    const soils = data.map(d => d.soilMoisture).filter(v => v != null);
    const waters = data.map(d => d.waterLevel).filter(v => v != null);
    const pumps = data.filter(d => d.pumpStatus === 'ON');
    
    const avg = arr => arr.length ? arr.reduce((a,b) => a+b, 0) / arr.length : null;
    const min = arr => arr.length ? Math.min(...arr) : null;
    const max = arr => arr.length ? Math.max(...arr) : null;
    const round = v => v != null ? Math.round(v * 10) / 10 : null;
    
    const reportData = {
      startDate: weekAgo,
      endDate: new Date(),
      avgTemp: round(avg(temps)),
      minTemp: round(min(temps)),
      maxTemp: round(max(temps)),
      avgHumidity: round(avg(humids)),
      minHumidity: round(min(humids)),
      maxHumidity: round(max(humids)),
      avgSoilMoisture: round(avg(soils)),
      minSoilMoisture: round(min(soils)),
      maxSoilMoisture: round(max(soils)),
      avgWaterLevel: round(avg(waters)),
      irrigationEvents: pumps.length,
      totalReadings: data.length
    };
    
    // Generate PDF report
    const pdfBuffer = await createEnhancedPdfReport(
      deviceIds.join(', '), 
      data, 
      reportData, 
      { period: 'Last 7 Days' }
    );
    
    // Send email with PDF attachment
    const sent = await EmailTypes.weeklyFarmReport(
      user.email, 
      user, 
      reportData, 
      pdfBuffer
    );
    
    if (!sent) return res.status(500).json({ error: 'Failed to send email' });
    
    res.json({ 
      ok: true, 
      message: 'Weekly report sent successfully',
      stats: {
        devices: devices.length,
        dataPoints: data.length,
        period: '7 days'
      }
    });
  } catch (e) {
    console.error('Weekly report error:', e);
    res.status(400).json({ error: 'Failed to send weekly report', details: e.message });
  }
}

// Admin functions
export async function adminListUsers(_req, res) {
  const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 }).lean();
  res.json(users);
}

export async function adminCreateUser(req, res) {
  try {
    const { name, email, password, role = 'farmer' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    const emailNorm = String(email).toLowerCase().trim();
    const exists = await User.findOne({ email: emailNorm });
    if (exists) return res.status(409).json({ error: 'Email already in use' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: emailNorm, passwordHash: hash, role });
    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (e) {
    res.status(400).json({ error: 'Create user failed', details: e.message });
  }
}

export async function adminUpdateUser(req, res) {
  const { id } = req.params;
  const { name, email, phone, role, profile, farmInfo } = req.body;
  const update = {};
  
  if (name) update.name = name;
  if (email) update.email = String(email).toLowerCase().trim();
  if (phone !== undefined) update.phone = phone;
  if (role) update.role = role;
  if (profile) update.profile = profile;
  if (farmInfo) update.farmInfo = farmInfo;
  
  const doc = await User.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true }).lean();
  if (!doc) return res.status(404).json({ error: 'User not found' });
  res.json({ id: doc._id, name: doc.name, email: doc.email, phone: doc.phone, role: doc.role, profile: doc.profile, farmInfo: doc.farmInfo });
}

export async function adminDeleteUser(req, res) {
  const { id } = req.params;
  const del = await User.findByIdAndDelete(id).lean();
  if (!del) return res.status(404).json({ error: 'User not found' });
  res.json({ ok: true });
}

export async function adminExportUsersCsv(_req, res) {
  const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 }).lean();
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
  const headers = [
    'name','email','phone','role','gender','dob','province','district','sector','cell','village','farmName','farmSizeValue','farmSizeUnit','farmType','type','createdAt'
  ];
  res.write(headers.join(',') + '\n');
  for (const u of users) {
    const addr = u.profile?.address || {};
    const row = [
      u.name ?? '',
      u.email ?? '',
      u.phone ?? '',
      u.role ?? '',
      u.profile?.gender ?? '',
      u.profile?.dob ? new Date(u.profile.dob).toISOString().split('T')[0] : '',
      addr.province ?? '',
      addr.district ?? '',
      addr.sector ?? '',
      addr.cell ?? '',
      addr.village ?? '',
      u.farmInfo?.farmName ?? '',
      u.farmInfo?.farmSizeValue ?? '',
      u.farmInfo?.farmSizeUnit ?? '',
      u.farmInfo?.farmType ?? '',
      u.farmInfo?.type ?? '',
      u.createdAt ? new Date(u.createdAt).toISOString() : ''
    ].map(v => String(v).replaceAll('"','""'));
    // Quote fields that contain comma, quote, or newline
    res.write(row.map(v => /[",\n]/.test(v) ? `"${v}"` : v).join(',') + '\n');
  }
  res.end();
}

export async function adminExportUsersPdf(_req, res) {
  const users = await User.find({}, { passwordHash: 0 }).sort({ createdAt: -1 }).lean();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="users.pdf"');
  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  doc.pipe(res);
  doc.fontSize(16).text('SmartFarmX — Users Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(1);
  const headers = ['Name','Email','Phone','Role','Province','District','Farm'];
  const colX = [36, 180, 320, 400, 450, 520, 580];
  doc.fontSize(9).fillColor('#444');
  headers.forEach((h, i) => doc.text(h, colX[i], doc.y, { continued: i < headers.length - 1 }));
  doc.moveDown(0.5);
  doc.moveTo(36, doc.y).lineTo(559, doc.y).strokeColor('#ccc').stroke();

  for (const u of users) {
    const addr = u.profile?.address || {};
    const values = [
      u.name || '-',
      u.email || '-',
      u.phone || '-',
      u.role || '-',
      addr.province || '-',
      addr.district || '-',
      u.farmInfo?.farmName || '-'
    ];
    doc.fillColor('#000').fontSize(9);
    let y = doc.y + 4;
    for (let i = 0; i < values.length; i++) {
      doc.text(values[i], colX[i], y, { width: (i===headers.length-1? 559-colX[i] : colX[i+1]-colX[i]-6), continued: false });
    }
    doc.moveDown(0.6);
  }
  doc.end();
}



