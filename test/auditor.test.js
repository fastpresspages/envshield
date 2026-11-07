import { test, describe } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { auditRepository } from '../src/auditor.js';

describe('auditor', () => {
  test('audits a secure repository setup', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'envshield-test-'));
    try {
      // Create .gitignore with .env
      writeFileSync(join(tmp, '.gitignore'), 'node_modules/\n.env\n.env.local\n', 'utf8');

      // Create clean .env.example
      writeFileSync(join(tmp, '.env.example'), 'PORT=3000\nAPI_KEY=your_key_here\n', 'utf8');

      const res = auditRepository(tmp);
      assert.strictEqual(res.summary.fail, 0);
      assert.ok(res.score >= 90);
      assert.ok(res.grade === 'A' || res.grade === 'A+');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('flags missing .gitignore and leaked secrets in example', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'envshield-bad-'));
    try {
      // Missing .gitignore
      // Leaked secret in .env.example
      const dummyStripe = ['sk', 'live', '1234567890abcdef12345678'].join('_');
      writeFileSync(join(tmp, '.env.example'), 'STRIPE_KEY=' + dummyStripe + '\n', 'utf8');

      const res = auditRepository(tmp);
      assert.ok(res.summary.fail >= 1);
      assert.ok(res.score < 80);
      assert.ok(res.fixes.length > 0);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
