/**
 * Zero-dependency Schema and Parity Validator for .env files
 */

import { parseEnv } from './parser.js';

export const SUPPORTED_TYPES = ['string', 'number', 'port', 'boolean', 'url', 'email', 'json'];

/**
 * Validate a concrete .env against an example or schema
 */
export function validateParity(envContent, exampleContent) {
  const { parsed: actual } = parseEnv(envContent);
  const { parsed: example, comments } = parseEnv(exampleContent);

  const missing = [];
  const extra = [];
  const empty = [];
  const typeErrors = [];

  const actualKeys = new Set(Object.keys(actual));
  const exampleKeys = new Set(Object.keys(example));

  // Check for missing keys
  for (const key of exampleKeys) {
    if (!actualKeys.has(key)) {
      missing.push({
        key,
        expectedType: inferTypeFromComment(comments[key]) || inferTypeFromValue(example[key]),
        description: comments[key] ? comments[key].join(' ') : '',
      });
    } else {
      const val = actual[key];
      if (val === '' || val === undefined) {
        empty.push(key);
      } else {
        // Validate types if specified
        const ruleType = inferTypeFromComment(comments[key]);
        if (ruleType) {
          const err = checkType(key, val, ruleType);
          if (err) typeErrors.push(err);
        }
      }
    }
  }

  // Check for extra keys not in example
  for (const key of actualKeys) {
    if (!exampleKeys.has(key)) {
      extra.push(key);
    }
  }

  const isValid = missing.length === 0 && typeErrors.length === 0;

  return {
    valid: isValid,
    totalExpected: exampleKeys.size,
    totalActual: actualKeys.size,
    missing,
    extra,
    empty,
    typeErrors,
  };
}

/**
 * Check if a value conforms to a type rule
 */
export function checkType(key, value, ruleType) {
  const t = ruleType.toLowerCase();

  if (t === 'number') {
    if (isNaN(Number(value)) || value.trim() === '') {
      return { key, value, expected: 'number', actual: typeof value, message: `${key} must be a valid number` };
    }
  } else if (t === 'port') {
    const num = Number(value);
    if (!Number.isInteger(num) || num < 1 || num > 65535) {
      return { key, value, expected: 'port (1-65535)', message: `${key} must be a valid port integer (1-65535)` };
    }
  } else if (t === 'boolean') {
    const b = value.toLowerCase().trim();
    if (!['true', 'false', '1', '0', 'yes', 'no'].includes(b)) {
      return { key, value, expected: 'boolean (true/false)', message: `${key} must be boolean (true/false/1/0)` };
    }
  } else if (t === 'url') {
    try {
      new URL(value);
    } catch {
      return { key, value, expected: 'url', message: `${key} must be a valid URL` };
    }
  } else if (t === 'email') {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      return { key, value, expected: 'email', message: `${key} must be a valid email address` };
    }
  } else if (t === 'json') {
    try {
      JSON.parse(value);
    } catch {
      return { key, value, expected: 'valid json', message: `${key} must be valid JSON` };
    }
  } else if (t.startsWith('enum:')) {
    const allowed = t.slice(5).split(',').map((x) => x.trim().toLowerCase());
    if (!allowed.includes(value.toLowerCase().trim())) {
      return { key, value, expected: `one of [${allowed.join(', ')}]`, message: `${key} must be one of [${allowed.join(', ')}]` };
    }
  }

  return null;
}

function inferTypeFromComment(commentList) {
  if (!commentList || commentList.length === 0) return null;
  const joined = commentList.join(' ');
  const match = joined.match(/\b(?:type|format):\s*([a-zA-Z0-9_,:]+)\b/i);
  return match ? match[1].toLowerCase() : null;
}

function inferTypeFromValue(val) {
  if (!val) return 'string';
  if (val === 'true' || val === 'false') return 'boolean';
  if (/^\d+$/.test(val)) return 'number';
  if (/^https?:\/\//.test(val)) return 'url';
  return 'string';
}
