/**
 * EnvShield — Zero-dependency environment security auditor, secret leak scanner, and schema validator
 * Apache-2.0 · FastPress Labs
 */

export { parseEnv, formatEnv } from './parser.js';
export {
  scanText,
  calculateShannonEntropy,
  maskSecret,
  SECRET_RULES,
} from './scanner.js';
export { validateParity, checkType, SUPPORTED_TYPES } from './schema.js';
export { generateExample } from './generator.js';
export { auditRepository } from './auditor.js';
