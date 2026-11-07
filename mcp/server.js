/**
 * EnvShield MCP Server — stdio JSON-RPC 2.0 interface
 * Zero runtime dependencies
 */

// Stdio JSON-RPC 2.0 interface
// Zero runtime dependencies
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { auditRepository } from '../src/auditor.js';
import { scanText } from '../src/scanner.js';
import { validateParity } from '../src/schema.js';
import { generateExample } from '../src/generator.js';

const TOOLS = [
  {
    name: 'audit_env',
    description: 'Perform a comprehensive environment variable and security leak audit of a directory or repository.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Root directory to audit (defaults to current working directory)',
        },
      },
    },
  },
  {
    name: 'scan_secrets',
    description: 'Scan arbitrary text or a specific file for leaked secrets, API keys, and high-entropy credentials.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Raw text content to scan',
        },
        path: {
          type: 'string',
          description: 'Path to file to read and scan',
        },
      },
    },
  },
  {
    name: 'validate_env',
    description: 'Validate parity and format compliance between a concrete .env and an expected .env.example.',
    inputSchema: {
      type: 'object',
      properties: {
        env_content: {
          type: 'string',
          description: 'Raw content of .env file',
        },
        example_content: {
          type: 'string',
          description: 'Raw content of .env.example template',
        },
        env_path: {
          type: 'string',
          description: 'Path to .env file',
        },
        example_path: {
          type: 'string',
          description: 'Path to .env.example file',
        },
      },
    },
  },
  {
    name: 'generate_example',
    description: 'Generate a clean, sanitized .env.example template from concrete .env content.',
    inputSchema: {
      type: 'object',
      properties: {
        env_content: {
          type: 'string',
          description: 'Raw content of .env file',
        },
        env_path: {
          type: 'string',
          description: 'Path to .env file to read and sanitize',
        },
      },
    },
  },
];

export async function handleRequest(request) {
  const { id, method, params } = request;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: 'envshield-mcp',
          version: '0.1.0',
        },
      },
    };
  }

  if (method === 'ping') {
    return { jsonrpc: '2.0', id, result: {} };
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: { tools: TOOLS },
    };
  }

  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params || {};

    if (name === 'audit_env') {
      const targetDir = args.path || process.cwd();
      const auditResult = auditRepository(targetDir);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(auditResult, null, 2),
            },
          ],
        },
      };
    }

    if (name === 'scan_secrets') {
      let content = args.text || '';
      let filename = '<text>';
      if (args.path) {
        const fullPath = resolve(args.path);
        if (existsSync(fullPath)) {
          content = readFileSync(fullPath, 'utf8');
          filename = args.path;
        } else {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: `Error: File not found: ${args.path}` }],
              isError: true,
            },
          };
        }
      }

      const leaks = scanText(content, { filename });
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ filename, leakCount: leaks.length, leaks }, null, 2),
            },
          ],
        },
      };
    }

    if (name === 'validate_env') {
      let envContent = args.env_content;
      let exContent = args.example_content;

      if (!envContent && args.env_path && existsSync(args.env_path)) {
        envContent = readFileSync(args.env_path, 'utf8');
      }
      if (!exContent && args.example_path && existsSync(args.example_path)) {
        exContent = readFileSync(args.example_path, 'utf8');
      }

      if (!envContent || !exContent) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: 'Error: Both env and example contents are required.' }],
            isError: true,
          },
        };
      }

      const parity = validateParity(envContent, exContent);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(parity, null, 2),
            },
          ],
        },
      };
    }

    if (name === 'generate_example') {
      let envContent = args.env_content;
      if (!envContent && args.env_path && existsSync(args.env_path)) {
        envContent = readFileSync(args.env_path, 'utf8');
      }

      if (!envContent) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: 'Error: env_content or valid env_path required.' }],
            isError: true,
          },
        };
      }

      const example = generateExample(envContent);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: example }],
        },
      };
    }

    return {
      jsonrpc: '2.0',
      id,
      result: {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      },
    };
  }

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: 'Method not found' },
  };
}

export function startStdioServer() {
  let buffer = '';

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', async (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop(); // keep remainder

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const req = JSON.parse(line);
        const res = await handleRequest(req);
        if (res) {
          process.stdout.write(JSON.stringify(res) + '\n');
        }
      } catch (err) {
        process.stdout.write(
          JSON.stringify({
            jsonrpc: '2.0',
            id: null,
            error: { code: -32700, message: 'Parse error', data: String(err) },
          }) + '\n'
        );
      }
    }
  });
}

// Auto-start stdio if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startStdioServer();
}
