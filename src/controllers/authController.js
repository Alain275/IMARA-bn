import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { EmailTypes } from '../services/emailService.js';
import { getJwtSecret } from '../config/jwtSecret.js';

function signToken(user) {
  const payload = { id: user._id, role: user.role, email: user.email };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

function normalizePhone(phone) {
  if (!phone) return undefined;
  return String(phone).replace(/\s+/g, '').replace(/-/g, '').trim();
}

function phoneLooseRegex(phone) {
  const escaped = String(phone).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = `^${escaped.split('').join('\\s*')}$`;
  return new RegExp(pattern);
}

export async function register(req, res) {
  try {
    const { name, email, phone, password, role = 'farmer', profile, farmInfo } = req.body;
    if (!name || !password) return res.status(400).json({ error: 'name and password required' });
    const phoneNorm = normalizePhone(phone);
    if (!email && !phoneNorm) return res.status(400).json({ error: 'email or phone required' });
    const emailNorm = email ? String(email).toLowerCase().trim() : undefined;
    const conflicts = await User.findOne({ $or: [ emailNorm ? { email: emailNorm } : null, phoneNorm ? { phone: phoneNorm } : null ].filter(Boolean) });
    if (conflicts) return res.status(409).json({ error: 'Email or phone already in use' });
    const hash = await bcrypt.hash(password, 10);
    
    // Prepare user data
    const userData = { 
      name, 
      email: emailNorm, 
      phone: phoneNorm, 
      passwordHash: hash, 
      role 
    };
    
    // Add profile data if provided
    if (profile) {
      userData.profile = profile;
    }
    
    // Add farm info if provided (for farmers)
    if (farmInfo && role === 'farmer') {
      userData.farmInfo = farmInfo;
    }
    
    const user = await User.create(userData);
    // fire-and-forget welcome email (non-blocking)
    if (user.email) {
      EmailTypes.welcome(user.email, user.name, user._id).catch(() => {});
    }
    const token = signToken(user);
    res.status(201).json({ 
      token, 
      user: { 
        id: user._id, 
        name, 
        email: emailNorm, 
        phone: phoneNorm, 
        role,
        profile: user.profile,
        farmInfo: user.farmInfo
      } 
    });
  } catch (e) {
    res.status(400).json({ error: 'Registration failed', details: e.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password, phone } = req.body;
    const identifier = phone || email;
    if (!identifier || !password) return res.status(400).json({ error: 'identifier and password required' });
    const emailNorm = String(identifier).toLowerCase().trim();
    const phoneNorm = normalizePhone(identifier);
    const query = emailNorm.includes('@')
      ? { email: emailNorm }
      : { $or: [{ phone: phoneNorm }, { phone: identifier }, { phone: phoneLooseRegex(phoneNorm) }] };
    const user = await User.findOne(query);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    if (user.email) {
      const forwarded = req.headers['x-forwarded-for'];
      const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip || '';
      EmailTypes.loginAlert(user.email, user.name, { userId: user._id, ip, at: new Date() }).catch(() => {});
    }
    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        phone: user.phone, 
        role: user.role, 
        avatarUrl: user.avatarUrl,
        profile: user.profile,
        farmInfo: user.farmInfo
      } 
    });
  } catch (e) {
    res.status(400).json({ error: 'Login failed', details: e.message });
  }
}

export async function me(req, res) {
  const { user } = req;
  res.json({ user });
}

export async function devSeed(_req, res) {
  try {
    const email = 'admin@smartfarmx.local';
    let user = await User.findOne({ email });
    if (!user) {
      const hash = await bcrypt.hash('admin123', 10);
      user = await User.create({ name: 'Admin', email, passwordHash: hash, role: 'admin' });
    }
    const token = signToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: 'Seed failed', details: e.message });
  }
}

export async function devNormalizeEmails(_req, res) {
  try {
    const all = await User.find({}, { email: 1 }).lean();
    let updated = 0;
    for (const u of all) {
      const norm = String(u.email).toLowerCase().trim();
      if (norm !== u.email) {
        await User.updateOne({ _id: u._id }, { $set: { email: norm } });
        updated++;
      }
    }
    res.json({ ok: true, updated });
  } catch (e) {
    res.status(500).json({ error: 'Normalization failed', details: e.message });
  }
}




