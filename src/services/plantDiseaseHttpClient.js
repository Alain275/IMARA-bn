import axios from 'axios';
import http from 'http';
import https from 'https';
import logger from './logger.js';

const API_PORT = String(process.env.PORT || '5001');

function trimSlash(s) {
  return String(s || '').trim().replace(/\/$/, '');
}

function resolveDiseaseApiBase() {
  const hostedDefault = 'https://smartfarmix-python.onrender.com';
  const isHostedRuntime = Boolean(
    process.env.RENDER ||
      process.env.RENDER_SERVICE_ID ||
      process.env.RENDER_EXTERNAL_URL ||
      String(process.env.NODE_ENV || '').toLowerCase() === 'production',
  );
  const renderDefault = trimSlash(isHostedRuntime ? hostedDefault : '');
  const localDefault = 'http://127.0.0.1:10000';
  const explicit = trimSlash(process.env.DISEASE_API_BASE || process.env.AI_BASE);

  let base = explicit || renderDefault || localDefault;

  try {
    const u = new URL(base);
    const diseasePort = u.port || (u.protocol === 'https:' ? '443' : '80');
    const listenPort = String(API_PORT || '5001');
    const localHost = /^(localhost|127\.0\.0\.1)$/i.test(u.hostname);
    const sameProcess = localHost && String(diseasePort) === listenPort;

    if (sameProcess) {
      logger.warn(
        `[plant-service] DISEASE_API_BASE (${base}) would call this API process (port ${listenPort}). ` +
          'Plant AI must be a separate service. Using deployed AI URL when available, else local :10000.',
      );
      if (renderDefault) return renderDefault;
      if (listenPort !== '10000') return localDefault;
      const fallbackHosted = 'https://smartfarmix-python.onrender.com';
      logger.error(
        `[plant-service] API and disease base both use port ${listenPort}. Forcing external AI base ${fallbackHosted}. Set DISEASE_API_BASE explicitly.`,
      );
      return fallbackHosted;
    }
  } catch {
    // ignore parse errors; axios will fail loudly
  }

  return base;
}

// Single source of truth: the AI service lives in `ai-services/python-api` (deployed separately).
export const PLANT_DISEASE_API_BASE = resolveDiseaseApiBase();
if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
  logger.info(`[plant-service] Using AI base: ${PLANT_DISEASE_API_BASE}`);
}

export class DiseaseServiceHttpError extends Error {
  constructor(status, body) {
    super(`Disease service responded with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

const DEFAULT_TIMEOUT_MS = Number(process.env.DISEASE_SERVICE_TIMEOUT_MS || 180000);
const MAX_ATTEMPTS = Math.max(1, Number(process.env.DISEASE_SERVICE_MAX_ATTEMPTS || 5));
const RETRY_DELAY_MS = Number(process.env.DISEASE_SERVICE_RETRY_DELAY_MS || 2000);
const DEFAULT_429_COOLDOWN_MS = Math.max(10_000, Number(process.env.DISEASE_SERVICE_429_COOLDOWN_MS || 60000));
const HEARTBEAT_INTERVAL_MS = Number(process.env.DISEASE_SERVICE_KEEPALIVE_INTERVAL_MS || 20000);
const HEARTBEAT_TIMEOUT_MS = Number(process.env.DISEASE_SERVICE_KEEPALIVE_TIMEOUT_MS || 5000);
const HEARTBEAT_PATH = process.env.DISEASE_SERVICE_KEEPALIVE_PATH || '/health';
// Disabled by default to avoid accidental 429s on hosted AI services.
const HEARTBEAT_ENABLED = process.env.DISEASE_SERVICE_HEARTBEAT === 'true';
const HEARTBEAT_FORCE_REMOTE = process.env.DISEASE_SERVICE_HEARTBEAT_FORCE_REMOTE === 'true';

const KEEPALIVE_AGENT_OPTIONS = {
  keepAlive: true,
  keepAliveMsecs: Number(process.env.DISEASE_SERVICE_KEEPALIVE_MSECS || 20000),
  maxSockets: Number(process.env.DISEASE_SERVICE_MAX_SOCKETS || 50),
  maxFreeSockets: Number(process.env.DISEASE_SERVICE_MAX_FREE_SOCKETS || 10),
};

const httpAgent = new http.Agent(KEEPALIVE_AGENT_OPTIONS);
const httpsAgent = new https.Agent({
  ...KEEPALIVE_AGENT_OPTIONS,
  rejectUnauthorized: process.env.DISEASE_SERVICE_TLS_INSECURE === 'true' ? false : undefined,
});

const client = axios.create({
  baseURL: PLANT_DISEASE_API_BASE,
  timeout: DEFAULT_TIMEOUT_MS,
  httpAgent,
  httpsAgent,
  maxBodyLength: Infinity,
  maxContentLength: Infinity,
  headers: {
    'User-Agent': `IMARA-Backend/${process.env.npm_package_version || 'dev'}`,
    Accept: 'application/json',
  },
});

let heartbeatTimer = null;
let heartbeatBackoffMs = HEARTBEAT_INTERVAL_MS;
let rateLimitedUntilTs = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(error) {
  if (!error) return false;

  if (error.code && ['ECONNABORTED', 'ECONNRESET', 'ENETUNREACH', 'EAI_AGAIN', 'ETIMEDOUT'].includes(error.code)) {
    return true;
  }

  if (!error.response) {
    return true;
  }

  const status = error.response.status;
  // Do not retry 429 in a tight loop; let cooldown + user retry handle it.
  if (status === 429) return false;
  if (status === 502 || status === 503) return true;
  return status >= 500;
}

function parseRetryAfterMs(error) {
  const raw = error?.response?.headers?.['retry-after'];
  if (!raw) return null;

  const asSeconds = Number(raw);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return asSeconds * 1000;
  }

  const asDate = Date.parse(String(raw));
  if (Number.isFinite(asDate)) {
    return Math.max(0, asDate - Date.now());
  }

  return null;
}

function backoffMs(error, attempt) {
  const status = error?.response?.status;
  if (status === 429) {
    return Math.min(45_000, 3000 * 2 ** (attempt - 1));
  }
  return RETRY_DELAY_MS * attempt;
}

function serializeResponseBody(body) {
  if (!body) return '';
  if (typeof body === 'string') {
    return body.slice(0, 2000);
  }
  try {
    return JSON.stringify(body).slice(0, 2000);
  } catch (_err) {
    return '[unserializable error payload]';
  }
}

async function buildMultipartHeaders(form) {
  const headers = form.getHeaders();
  const contentLength = await new Promise((resolve, reject) => {
    form.getLength((err, length) => {
      if (err) {
        reject(err);
      } else {
        resolve(length);
      }
    });
  });

  if (contentLength) {
    headers['Content-Length'] = contentLength;
  }

  return { headers, contentLength };
}

export async function sendPredictionRequest(formFactory, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (typeof formFactory !== 'function') {
    throw new Error('formFactory must be a function that returns a FormData instance');
  }

  if (rateLimitedUntilTs > Date.now()) {
    const secondsLeft = Math.max(1, Math.ceil((rateLimitedUntilTs - Date.now()) / 1000));
    throw new DiseaseServiceHttpError(
      429,
      JSON.stringify({ message: 'Disease service is cooling down', retryAfterSeconds: secondsLeft }),
    );
  }

  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const form = formFactory();

    try {
      const { headers, contentLength } = await buildMultipartHeaders(form);
      logger.info(`[plant-service] Sending prediction request (Content-Length: ${contentLength ?? 'unknown'})`);

      const response = await client.post('/predict', form, {
        headers,
        timeout: timeoutMs,
      });

      const data = response.data || {};
      if (data && !data.disease_info && data.info) {
        data.disease_info = data.info;
      }
      return data;
    } catch (error) {
      if (error?.response?.status === 429) {
        const retryAfterMs = parseRetryAfterMs(error) ?? DEFAULT_429_COOLDOWN_MS;
        rateLimitedUntilTs = Date.now() + retryAfterMs;
        logger.warn(
          `[plant-service] AI service rate-limited (429). Cooling down for ${Math.max(
            1,
            Math.ceil(retryAfterMs / 1000),
          )}s before next request.`,
        );
      }

      if (error.response) {
        lastError = new DiseaseServiceHttpError(error.response.status, serializeResponseBody(error.response.data));
      } else {
        lastError = error;
      }

      const retryable = shouldRetry(error) && attempt < MAX_ATTEMPTS;
      if (!retryable) {
        throw lastError;
      }

      const wait = backoffMs(error, attempt);
      logger.warn(
        `[plant-service] Attempt ${attempt} failed (${error.message || error.code || 'unknown'}) - retrying in ${wait}ms`,
      );
      await sleep(wait);
    }
  }

  throw lastError;
}

export function startPlantDiseaseHeartbeat() {
  if (!HEARTBEAT_ENABLED || heartbeatTimer) {
    return;
  }

  try {
    const u = new URL(PLANT_DISEASE_API_BASE);
    const isLocalHost = /^(localhost|127\.0\.0\.1)$/i.test(u.hostname);
    if (!isLocalHost && !HEARTBEAT_FORCE_REMOTE) {
      logger.info('[plant-service] Heartbeat disabled for remote AI base (set DISEASE_SERVICE_HEARTBEAT_FORCE_REMOTE=true to override).');
      return;
    }
  } catch {
    logger.warn('[plant-service] Invalid PLANT_DISEASE_API_BASE; heartbeat startup skipped.');
    return;
  }

  const tick = async () => {
    try {
      await client.get(HEARTBEAT_PATH, { timeout: HEARTBEAT_TIMEOUT_MS });
      heartbeatBackoffMs = HEARTBEAT_INTERVAL_MS;
      logger.debug('[plant-service] heartbeat OK');
    } catch (error) {
      const status = error?.response?.status;
      if (status === 429) {
        heartbeatBackoffMs = Math.min(5 * 60 * 1000, Math.max(heartbeatBackoffMs * 2, 60000));
        logger.warn(`[plant-service] heartbeat rate-limited (429). Next attempt in ${Math.round(heartbeatBackoffMs / 1000)}s`);
      } else {
        heartbeatBackoffMs = Math.min(2 * 60 * 1000, Math.max(heartbeatBackoffMs * 1.5, HEARTBEAT_INTERVAL_MS));
        logger.warn(`[plant-service] heartbeat failed: ${error.message}`);
      }
    } finally {
      heartbeatTimer = setTimeout(tick, heartbeatBackoffMs);
      if (typeof heartbeatTimer.unref === 'function') heartbeatTimer.unref();
    }
  };

  heartbeatTimer = setTimeout(tick, 1000);

  if (typeof heartbeatTimer.unref === 'function') {
    heartbeatTimer.unref();
  }
}

export function stopPlantDiseaseHeartbeat() {
  if (heartbeatTimer) {
    clearTimeout(heartbeatTimer);
    heartbeatTimer = null;
    heartbeatBackoffMs = HEARTBEAT_INTERVAL_MS;
  }
}
