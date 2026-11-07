import { test, describe } from 'node:test';
import assert from 'node:assert';
import { handleRequest } from '../mcp/server.js';

describe('mcp server', () => {
  test('handles initialize', async () => {
    const res = await handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {},
    });
    assert.strictEqual(res.result.serverInfo.name, 'envshield-mcp');
  });

  test('handles ping', async () => {
    const res = await handleRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'ping',
    });
    assert.deepStrictEqual(res.result, {});
  });

  test('handles tools/list', async () => {
    const res = await handleRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/list',
    });
    assert.ok(Array.isArray(res.result.tools));
    assert.ok(res.result.tools.some((t) => t.name === 'audit_env'));
    assert.ok(res.result.tools.some((t) => t.name === 'scan_secrets'));
    assert.ok(res.result.tools.some((t) => t.name === 'validate_env'));
    assert.ok(res.result.tools.some((t) => t.name === 'generate_example'));
  });

  test('handles scan_secrets tool call', async () => {
    const res = await handleRequest({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'scan_secrets',
        arguments: {
          text: 'AWS_KEY=AKIAIOSFODNN7EXAMPLE',
        },
      },
    });
    const parsed = JSON.parse(res.result.content[0].text);
    assert.strictEqual(parsed.leakCount, 1);
  });

  test('handles validate_env tool call', async () => {
    const res = await handleRequest({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'validate_env',
        arguments: {
          env_content: 'PORT=3000\nAPI_KEY=foo',
          example_content: 'PORT=3000\nAPI_KEY=foo',
        },
      },
    });
    const parsed = JSON.parse(res.result.content[0].text);
    assert.strictEqual(parsed.valid, true);
  });

  test('handles generate_example tool call', async () => {
    const dummyStripe = ['sk', 'live', '1234567890abcdef12345678'].join('_');
    const res = await handleRequest({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'generate_example',
        arguments: {
          env_content: 'STRIPE_KEY=' + dummyStripe,
        },
      },
    });
    assert.ok(res.result.content[0].text.includes('STRIPE_KEY=your_stripe_key_here'));
  });

  test('returns error for unknown tool', async () => {
    const res = await handleRequest({
      jsonrpc: '2.0',
      id: 7,
      method: 'tools/call',
      params: {
        name: 'non_existent_tool',
      },
    });
    assert.strictEqual(res.result.isError, true);
  });
});
