/**
 * Zero-dependency .env.example Sanitizer and Generator
 */

import { parseEnv } from './parser.js';

export function generateExample(envContent, options = {}) {
  const { placeholder = 'your_{key}_here', preserveDefaults = true } = options;
  const { parsed, comments } = parseEnv(envContent);

  const lines = [];

  for (const [key, val] of Object.entries(parsed)) {
    // Preserve comments preceding key
    if (comments[key]) {
      for (const c of comments[key]) {
        lines.push(`# ${c}`);
      }
    }

    const typeHint = inferTypeHint(key, val);
    const safeVal = getSanitizedValue(key, val, placeholder, preserveDefaults);

    lines.push(`${key}=${safeVal}${typeHint ? ` # type: ${typeHint}` : ''}`);
  }

  return lines.join('\n') + '\n';
}

function getSanitizedValue(key, val, placeholder, preserveDefaults) {
  const k = key.toUpperCase();

  // If preserveDefaults is true, keep common safe non-secret defaults
  if (preserveDefaults) {
    if (k === 'NODE_ENV') return val || 'development';
    if (k === 'PORT') return val || '3000';
    if (k === 'HOST') return val || 'localhost';
    if (k === 'LOG_LEVEL') return val || 'info';
    if (k === 'DEBUG') return val || 'false';
  }

  // Common URL patterns
  if (k.includes('DATABASE_URL') || k.includes('DB_URI')) {
    return 'postgres://user:password@localhost:5432/dbname';
  }
  if (k.includes('REDIS_URL')) {
    return 'redis://localhost:6379';
  }
  if (k.includes('URL') || k.includes('ENDPOINT')) {
    return 'https://api.example.com';
  }

  // Sensitive patterns
  if (isSecretKey(k)) {
    return `your_${key.toLowerCase()}_here`;
  }

  // Numbers or booleans
  if (val === 'true' || val === 'false') return val;
  if (/^\d+$/.test(val) && Number(val) < 100000) return val;

  return placeholder.replace('{key}', key.toLowerCase());
}

function isSecretKey(k) {
  return (
    k.includes('SECRET') ||
    k.includes('PASSWORD') ||
    k.includes('PASS') ||
    k.includes('TOKEN') ||
    k.includes('KEY') ||
    k.includes('AUTH') ||
    k.includes('PRIVATE') ||
    k.includes('CREDENTIAL')
  );
}

function inferTypeHint(key, val) {
  const k = key.toUpperCase();
  if (k === 'PORT' || /^\d+$/.test(val)) return 'number';
  if (val === 'true' || val === 'false') return 'boolean';
  if (k.includes('EMAIL')) return 'email';
  if (k.includes('URL') || k.includes('URI')) return 'url';
  return null;
}
