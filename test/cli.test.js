import { test, describe } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CLI_PATH = join(process.cwd(), 'bin', 'envshield.js');

describe('cli', () => {
  test('prints help with --help', () => {
    const out = execSync(`node "${CLI_PATH}" --help`, { encoding: 'utf8' });
    assert.ok(out.includes('Usage: envshield'));
    assert.ok(out.includes('Commands:'));
    assert.ok(out.includes('Options:'));
  });

  test('prints version with --version', () => {
    const out = execSync(`node "${CLI_PATH}" --version`, { encoding: 'utf8' });
    assert.ok(out.includes('envshield v0.1.0'));
  });

  test('generates example from concrete env', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'envshield-cli-'));
    try {
      const envFile = join(tmp, '.env');
      writeFileSync(envFile, 'PORT=5000\nAPI_SECRET=supersecret123\n', 'utf8');

      const out = execSync(`node "${CLI_PATH}" generate "${envFile}"`, { encoding: 'utf8' });
      assert.ok(out.includes('PORT=5000'));
      assert.ok(out.includes('API_SECRET=your_api_secret_here'));
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('audits clean repository setup and prints json format', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'envshield-cli-audit-'));
    try {
      writeFileSync(join(tmp, '.gitignore'), '.env\nnode_modules/\n', 'utf8');
      writeFileSync(join(tmp, '.env.example'), 'PORT=3000\n', 'utf8');

      const out = execSync(`node "${CLI_PATH}" audit "${tmp}" --format json`, { encoding: 'utf8' });
      const parsed = JSON.parse(out);
      assert.strictEqual(parsed.summary.fail, 0);
      assert.ok(parsed.score >= 90);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
