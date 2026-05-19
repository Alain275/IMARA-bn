import fs from 'fs';

const IS_PROD = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

function readSecretFromFile() {
  const filePath = process.env.JWT_SECRET_FILE?.trim();
  if (!filePath) return { secret: null, error: null };
  try {
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) {
      return { secret: null, error: `JWT_SECRET_FILE is empty: ${filePath}` };
    }
    return { secret: raw, error: null };
  } catch (e) {
    return { secret: null, error: `Cannot read JWT_SECRET_FILE (${filePath}): ${e.message}` };
  }
}

function jwtSecretMissingMessage() {
  const parts = [
    'JWT_SECRET is required when NODE_ENV=production.',
    'Set JWT_SECRET in your host environment to a long random string (for example 32+ characters).',
    'Alternatively set JWT_SECRET_FILE to a path containing the secret (some platforms mount secrets as files).',
  ];
  if (process.env.RENDER === 'true') {
    parts.push(
      'On Render: open this Web Service → Environment → add variable JWT_SECRET → Save → Manual Deploy.',
    );
  }
  return parts.join(' ');
}

/**
 * Returns the JWT signing secret. In non-production, falls back to dev_secret when unset.
 * In production, requires JWT_SECRET or a readable JWT_SECRET_FILE.
 */
export function getJwtSecret() {
  const fromEnv = process.env.JWT_SECRET?.trim() || '';
  const { secret: fromFile, error: fileError } = readSecretFromFile();
  if (process.env.JWT_SECRET_FILE?.trim() && fileError) {
    throw new Error(fileError);
  }
  const secret = fromEnv || fromFile || (!IS_PROD ? 'dev_secret' : '');
  if (!secret) {
    throw new Error(jwtSecretMissingMessage());
  }
  return secret;
}

/** Call once at process startup so misconfiguration fails fast with a clear message. */
export function assertJwtSecretConfiguredAtStartup() {
  getJwtSecret();
}
