# Contributing to EnvShield

Contributions are welcome!

## Principles
1. **Zero Runtime Dependencies:** Pure Node.js standard library only (Node >= 18.17).
2. **Deterministic & Fast:** Secret scanning and schema validation must execute in milliseconds without external network calls.
3. **Comprehensive Tests:** Add unit tests in `test/` using `node:test` for any new leak pattern or validation rule.

## Verification
```bash
npm test
node bin/envshield.js --help
node bin/envshield.js audit .
```
