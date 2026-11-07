import { test, describe } from 'node:test';
import assert from 'node:assert';
import { generateExample } from '../src/generator.js';

describe('generator', () => {
  test('sanitizes real credentials while preserving structure', () => {
    const dummyStripe = ['sk', 'live', '1234567890abcdef12345678'].join('_');
    const dummyGh = ['ghp', 'ABC1234567890abcdefghijklmnopqrstuv'].join('_');
    const raw = `
# Web server
PORT=4000
NODE_ENV=production

# Secrets
DATABASE_URL=postgres://root:supersecretpassword@10.0.0.1:5432/maindb
STRIPE_KEY=${dummyStripe}
GITHUB_TOKEN=${dummyGh}
`;
    const example = generateExample(raw);

    assert.ok(example.includes('# Web server'));
    assert.ok(example.includes('PORT=4000'));
    assert.ok(example.includes('NODE_ENV=production'));
    assert.ok(!example.includes('supersecretpassword'));
    assert.ok(!example.includes(dummyStripe));
    assert.ok(!example.includes(dummyGh));
    assert.ok(example.includes('postgres://user:password@localhost:5432/dbname'));
    assert.ok(example.includes('STRIPE_KEY=your_stripe_key_here'));
  });
});
