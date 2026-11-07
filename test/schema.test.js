import { test, describe } from 'node:test';
import assert from 'node:assert';
import { validateParity, checkType } from '../src/schema.js';

describe('schema & parity', () => {
  test('validates type rules', () => {
    assert.strictEqual(checkType('PORT', '3000', 'port'), null);
    assert.notStrictEqual(checkType('PORT', '999999', 'port'), null);
    assert.notStrictEqual(checkType('PORT', 'invalid', 'port'), null);

    assert.strictEqual(checkType('SSL', 'true', 'boolean'), null);
    assert.notStrictEqual(checkType('SSL', 'maybe', 'boolean'), null);

    assert.strictEqual(checkType('URL', 'https://example.com/api', 'url'), null);
    assert.notStrictEqual(checkType('URL', 'not-a-url', 'url'), null);

    assert.strictEqual(checkType('ENV', 'production', 'enum:development,production,test'), null);
    assert.notStrictEqual(checkType('ENV', 'staging', 'enum:development,production,test'), null);
  });

  test('validates parity between actual .env and template .env.example', () => {
    const example = `
# type: port
PORT=3000
# type: url
API_URL=https://api.example.com
SECRET_TOKEN=placeholder
`;
    const validActual = `
PORT=8080
API_URL=https://myapi.com
SECRET_TOKEN=actualsecret
`;
    const res = validateParity(validActual, example);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.missing.length, 0);
    assert.strictEqual(res.typeErrors.length, 0);

    const invalidActual = `
PORT=not-a-number
`;
    const res2 = validateParity(invalidActual, example);
    assert.strictEqual(res2.valid, false);
    assert.strictEqual(res2.missing.length, 2);
    assert.strictEqual(res2.typeErrors.length, 1);
  });
});
