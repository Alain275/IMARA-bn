/** Reject heartbeat counters and bogus RTDB fields (e.g. lastUpdate: 297) mistaken for Unix time. */
const MIN_UNIX_SEC = 946684800; // 2000-01-01 UTC
const MAX_CLOCK_SKEW_MS = 24 * 60 * 60 * 1000;

/**
 * @returns {number | null} epoch milliseconds, or null if not a plausible wall-clock value
 */
export function coercePlausibleWallClockMs(ts, now = Date.now()) {
  if (ts == null || ts === '') return null;
  const n = Number(ts);
  if (!Number.isNaN(n)) {
    let ms;
    if (n >= 1e12) ms = n;
    else if (n >= MIN_UNIX_SEC) ms = n * 1000;
    else return null;
    if (ms < MIN_UNIX_SEC * 1000) return null;
    if (ms > now + MAX_CLOCK_SKEW_MS) return null;
    return ms;
  }
  const d = new Date(ts).getTime();
  if (Number.isNaN(d)) return null;
  if (d < MIN_UNIX_SEC * 1000) return null;
  if (d > now + MAX_CLOCK_SKEW_MS) return null;
  return d;
}

/**
 * Pick a telemetry instant for greenhouse health. Falls back to `now` when RTDB has live sensor
 * payload but no trustworthy clock fields (common with firmware counters under device/status).
 */
export function pickGreenhouseTelemetryMs({ latestVal, statusVal, sensors, systemInfo } = {}, now = Date.now()) {
  const staleAfterMs = Number(process.env.DEVICE_STALE_AFTER_MS || 5 * 60 * 1000);
  const candidates = [
    latestVal?.timestamp,
    sensors?.timestamp,
    systemInfo?.timestamp,
    statusVal?.lastUpdate,
    statusVal?.timestamp,
  ];
  for (const c of candidates) {
    const ms = coercePlausibleWallClockMs(c, now);
    if (ms != null) return ms;
  }
  const s = sensors && typeof sensors === 'object' ? sensors : {};
  const hasPayload =
    s.temperature != null ||
    s.humidity != null ||
    s.soilMoisture != null ||
    s.soil != null ||
    s.lightIntensity != null ||
    s.light != null ||
    s.waterLevel != null;
  // Some firmware builds keep old timestamps but continue publishing fresh sensor values.
  // When payload exists and all clock fields are older than stale threshold, treat this poll as live.
  if (hasPayload) {
    const freshest = candidates
      .map((c) => coercePlausibleWallClockMs(c, now))
      .filter((x) => x != null)
      .sort((a, b) => b - a)[0];
    if (freshest == null || now - freshest > staleAfterMs) return now;
    return freshest;
  }
  return null;
}

/**
 * Health policy:
 * - online: <= offlineAfterMs since last telemetry
 * - offline: > offlineAfterMs
 * - stale: > staleAfterMs
 */
export function evaluateDeviceHealth(lastTelemetryAt, now = Date.now()) {
  const offlineAfterMs = Number(process.env.DEVICE_OFFLINE_AFTER_MS || 2 * 60 * 1000);
  const staleAfterMs = Number(process.env.DEVICE_STALE_AFTER_MS || 5 * 60 * 1000);
  const ts = coercePlausibleWallClockMs(lastTelemetryAt, now);
  if (!ts) {
    return {
      state: 'offline',
      latencyMs: null,
      offlineAfterMs,
      staleAfterMs,
      lastTelemetryAt: null,
      isLive: false,
    };
  }
  const latencyMs = Math.max(0, now - ts);
  const state = latencyMs > staleAfterMs ? 'stale' : latencyMs > offlineAfterMs ? 'offline' : 'online';
  return {
    state,
    latencyMs,
    offlineAfterMs,
    staleAfterMs,
    lastTelemetryAt: ts,
    isLive: state === 'online',
  };
}

export function normalizeTimestamp(ts) {
  return coercePlausibleWallClockMs(ts);
}
