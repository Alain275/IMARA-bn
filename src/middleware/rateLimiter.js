/**
 * Rate limiting middleware to prevent abuse
 */
import rateLimit from 'express-rate-limit';

function requestPath(req) {
  return String(req.originalUrl || req.url || '').split('?')[0];
}

/** High-frequency read endpoints (dashboard polling) — do not count toward strict API cap */
function isPollingSafeRead(req) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  const p = requestPath(req);
  if (p.startsWith('/api/iot/greenhouse')) return true;
  if (p.startsWith('/api/intelligence/greenhouse/summary')) return true;
  if (p.startsWith('/api/reports/public/ai-summary')) return true;
  if (p.startsWith('/api/auth/me')) return true;
  if (p.startsWith('/api/sensors')) return true;
  if (p === '/health' || p === '/health/db') return true;
  return false;
}

const apiMax = Math.max(500, Number(process.env.API_RATE_LIMIT_MAX || 8000));

/**
 * General API rate limiter (per IP).
 * Default raised for production dashboards that poll + load multiple pages.
 * Override with API_RATE_LIMIT_MAX. Greenhouse GET telemetry is excluded.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: apiMax,
  message: {
    error: 'Too many requests from this IP, please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const whitelist = (process.env.RATE_LIMIT_WHITELIST || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (whitelist.includes(req.ip)) return true;
    return isPollingSafeRead(req);
  }
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many authentication attempts, please try again later',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * Rate limiter for data ingestion endpoints
 * 1000 requests per minute per IP (for IoT devices)
 */
export const iotLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000,
  message: {
    error: 'Too many data ingestion requests, please slow down',
    retryAfter: '1 minute'
  },
});

/**
 * Rate limiter for file uploads
 * 10 uploads per hour per IP
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'Too many file uploads, please try again later',
    retryAfter: '1 hour'
  },
});

/**
 * Plant diagnosis limiter.
 * Keeps AI traffic predictable so upstream Python service is not spammed.
 */
export const plantHealthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: Math.max(1, Number(process.env.PLANT_HEALTH_RATE_LIMIT_MAX || 3)),
  message: {
    error: 'Too many plant diagnosis requests. Please wait a minute and try again.',
    retryAfter: '1 minute',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for report generation
 * 20 reports per hour per user
 */
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: {
    error: 'Too many report requests, please try again later',
    retryAfter: '1 hour'
  },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip;
  }
});
