import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { getJwtSecret } from '../config/jwtSecret.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const secret = getJwtSecret();
    const payload = jwt.verify(token, secret);
    const user = await User.findById(payload.id).lean();
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    req.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

/** Sets `req.user` when a valid Bearer token is present; otherwise `req.user` is undefined. Never returns 401. */
export async function optionalAuthenticate(req, res, next) {
  req.user = undefined;
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next();
    const secret = getJwtSecret();
    const payload = jwt.verify(token, secret);
    const user = await User.findById(payload.id).lean();
    if (!user) return next();
    req.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl };
    next();
  } catch {
    next();
  }
}




