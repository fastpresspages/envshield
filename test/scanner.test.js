import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  scanText,
  calculateShannonEntropy,
  maskSecret,
} from '../src/scanner.js';

describe('scanner', () => {
  test('calculates Shannon entropy accurately', () => {
    // Low entropy
    const low = calculateShannonEntropy('aaaaaaaaaaaa');
    assert.strictEqual(low, 0);

    // High entropy
    const high = calculateShannonEntropy('8f9J2mK9pL0xQ1vR8zY3wT6s');
    assert.ok(high > 4.0);
  });

  test('masks secrets safely', () => {
    assert.strictEqual(maskSecret('short'), '*****');
    const masked = maskSecret('AKIA1234567890ABCDEF');
    assert.ok(masked.startsWith('AKI'));
    assert.ok(masked.endsWith('DEF'));
    assert.ok(masked.includes('*'));
  });

  test('detects AWS access key', () => {
    const text = 'AWS_KEY=AKIAIOSFODNN7EXAMPLE\n';
    const leaks = scanText(text);
    assert.strictEqual(leaks.length, 1);
    assert.strictEqual(leaks[0].ruleId, 'aws.access-key');
    assert.strictEqual(leaks[0].line, 1);
  });

  test('detects GitHub Personal Access Token', () => {
    const dummyPat = ['ghp', 'ABC1234567890abcdefghijklmnopqrstuv'].join('_');
    const text = 'GITHUB_TOKEN=' + dummyPat + '\n';
    const leaks = scanText(text);
    assert.strictEqual(leaks.length, 1);
    assert.strictEqual(leaks[0].ruleId, 'github.pat');
  });

  test('detects OpenAI API key', () => {
    const text = 'OPENAI_API_KEY=sk-proj-abc1234567890abcdef1234567890abcdef1234567890\n';
    const leaks = scanText(text);
    assert.strictEqual(leaks.length, 1);
    assert.strictEqual(leaks[0].ruleId, 'openai.api-key');
  });

  test('detects Stripe live secret key', () => {
    const dummyStripe = ['sk', 'live', '1234567890abcdef12345678'].join('_');
    const text = 'STRIPE_SECRET=' + dummyStripe + '\n';
    const leaks = scanText(text);
    assert.strictEqual(leaks.length, 1);
    assert.strictEqual(leaks[0].ruleId, 'stripe.api-key');
  });

  test('detects Database URI with live credentials', () => {
    const text = 'DATABASE_URL=postgres://admin:s3cr3tP@ssw0rd@db.example.com:5432/production\n';
    const leaks = scanText(text);
    assert.strictEqual(leaks.length, 1);
    assert.strictEqual(leaks[0].ruleId, 'database.uri-credentials');
  });

  test('ignores safe dummy placeholders', () => {
    const text = `
API_KEY=your_api_key_here
SECRET_KEY=change_me
OPENAI_KEY=your_secret_here
TEST_KEY=pk_test_1234567890abcdef12345678
`;
    const leaks = scanText(text);
    assert.strictEqual(leaks.length, 0);
  });
});
