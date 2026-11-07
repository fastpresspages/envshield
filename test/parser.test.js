import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseEnv, formatEnv } from '../src/parser.js';

describe('parser', () => {
  test('parses basic key=value lines and ignores comments', () => {
    const raw = `
# Server config
PORT=8080
HOST=127.0.0.1
DEBUG=true
`;
    const { parsed, comments } = parseEnv(raw);
    assert.strictEqual(parsed.PORT, '8080');
    assert.strictEqual(parsed.HOST, '127.0.0.1');
    assert.strictEqual(parsed.DEBUG, 'true');
    assert.ok(comments.PORT);
    assert.strictEqual(comments.PORT[0], 'Server config');
  });

  test('parses single and double quotes, stripping inline comments for unquoted', () => {
    const raw = `
KEY_A="hello world # not a comment"
KEY_B='single quote value'
KEY_C=unquoted # inline comment
KEY_D=export VAR_EXPORT=123
`;
    const { parsed } = parseEnv(raw);
    assert.strictEqual(parsed.KEY_A, 'hello world # not a comment');
    assert.strictEqual(parsed.KEY_B, 'single quote value');
    assert.strictEqual(parsed.KEY_C, 'unquoted');
  });

  test('parses multiline quoted values', () => {
    const raw = `
CERT="-----BEGIN CERTIFICATE-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A
-----END CERTIFICATE-----"
ANOTHER_KEY=simple
`;
    const { parsed } = parseEnv(raw);
    assert.ok(parsed.CERT.includes('\n'));
    assert.ok(parsed.CERT.includes('BEGIN CERTIFICATE'));
    assert.strictEqual(parsed.ANOTHER_KEY, 'simple');
  });

  test('formatEnv serializes object to env syntax', () => {
    const obj = {
      APP_NAME: 'My App',
      PORT: '3000',
    };
    const out = formatEnv(obj);
    assert.ok(out.includes('APP_NAME="My App"'));
    assert.ok(out.includes('PORT=3000'));
  });
});
