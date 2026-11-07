# EnvShield 🛡️

[![CI](https://github.com/fastpresspages/envshield/actions/workflows/ci.yml/badge.svg)](https://github.com/fastpresspages/envshield/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-3DDC84?labelColor=08080A)](https://github.com/fastpresspages/envshield/blob/main/LICENSE)
[![Dependencies](https://img.shields.io/badge/dependencies-0-A78BFA?labelColor=08080A)](https://github.com/fastpresspages/envshield)
[![Node: >=18.17](https://img.shields.io/badge/node-%3E%3D18.17-C6FF4A?labelColor=08080A)](https://nodejs.org/)

Zero-dependency environment security auditor, secret leak detector, and schema validator for CI and AI agents.

Audits repository `.gitignore` protection, detects live credentials in `.env.example` templates, checks type and parity between `.env` and `.env.example`, and automatically generates safe `.env.example` files.

Built by [FastPress Labs](https://github.com/fastpresspages). 100% free, Apache-2.0, zero runtime dependencies.

---

## Why EnvShield?

1. **Accidental Credential Commits:** Committing `.env` files or leaving real API keys inside `.env.example` is one of the most common security breaches.
2. **Environment Variable Parity Drifts:** Staging or local dev breaks because someone added `STRIPE_WEBHOOK_SECRET` to their code but forgot to document it in `.env.example`.
3. **Agent & CI Protection:** AI coding agents and CI runners need a fast, zero-install, zero-network utility to verify repository hygiene before publishing or deploying.

---

## Quickstart

Run directly without installing:

```bash
# Full environment security audit
npx -p github:fastpresspages/envshield envshield audit

# Scan any file for leaked API keys & high-entropy tokens
npx -p github:fastpresspages/envshield envshield scan .env.example

# Validate parity between .env and .env.example
npx -p github:fastpresspages/envshield envshield check .env --example .env.example

# Generate a sanitized .env.example from your live .env
npx -p github:fastpresspages/envshield envshield generate .env -o .env.example
```

---

## Features

- **Zero Runtime Dependencies:** Pure Node.js (>=18.17). No external packages, no telemetry, no tracking.
- **Leak Detection:** Shannon entropy analysis combined with precision regex patterns for AWS, GitHub PATs, OpenAI, Anthropic, Stripe, Slack, Database credentials, Google API keys, JWTs, and private keys.
- **Parity & Schema Validation:** Checks missing keys, extra keys, and type constraints (`port`, `number`, `boolean`, `url`, `email`, `enum`).
- **Template Sanitizer:** Automatically generates production-ready `.env.example` files with masked placeholders while preserving non-sensitive defaults.
- **Multi-Interface:** CLI, programmatic JavaScript API, Model Context Protocol (MCP) server, and GitHub Action.

---

## CLI Reference

```
Usage: envshield [command] [options]

Commands:
  audit [dir]               Run full environment security audit (default)
  scan <file_or_dir>        Scan file for secret leaks and high-entropy credentials
  check <env> --example <ex> Validate parity and types between .env and .env.example
  generate [env_file]       Generate sanitized .env.example from concrete .env

Options:
  --fail-under <score>      Fail (exit code 2) if audit score is below threshold (0-100)
  --format <fmt>            Output format: terminal, json, or markdown (default: terminal)
  -o, --out <file_or_dir>   Write output to specified file or directory
  -v, --version             Print version (0.1.0)
  -h, --help                Show help message
```

---

## Model Context Protocol (MCP) Server

EnvShield includes a standard stdio JSON-RPC MCP server (`envshield-mcp`) so Claude Code, Cursor, Windsurf, OpenCode, and any MCP client can audit environments natively:

Add to your MCP settings (`claude_desktop_config.json`, `opencode.json`, etc.):

```json
{
  "mcpServers": {
    "envshield": {
      "command": "npx",
      "args": ["-p", "github:fastpresspages/envshield", "envshield-mcp"]
    }
  }
}
```

### Exposed MCP Tools:
- `audit_env`: Audits directory `.gitignore` and `.env` security hygiene.
- `scan_secrets`: Scans code or text for credential leaks.
- `validate_env`: Compares `.env` against `.env.example`.
- `generate_example`: Creates sanitized `.env.example` templates.

---

## GitHub Action

Fail CI builds whenever secrets leak or environment files are left unprotected:

```yaml
- name: Audit Environment Security
  uses: fastpresspages/envshield@v0.1.0
  with:
    path: .
    fail-under: 80
    example: .env.example
```

Outputs:
- `score`: Numeric score (0-100)
- `grade`: Letter grade (A+ to F)
- `status`: `pass` or `fail`

---

## Programmatic API

```javascript
import {
  auditRepository,
  scanText,
  parseEnv,
  validateParity,
  generateExample,
} from 'envshield';

// 1. Audit repository
const report = auditRepository('./my-project');
console.log(`Grade: ${report.grade} (${report.score}/100)`);

// 2. Scan text for leaks
const leaks = scanText('AWS_KEY=AKIAIOSFODNN7EXAMPLE');
console.log(`Found ${leaks.length} leaks`);

// 3. Generate sanitized .env.example
const example = generateExample(rawEnvContent);
```

---

## More from FastPress Labs

- [LaunchGrade](https://github.com/fastpresspages/launchgrade) — 54-check launch page auditor CLI, Action & MCP.
- [RepoGrade](https://github.com/fastpresspages/repograde) — 33-check repository health auditor CLI, Action & MCP.
- [ContextPack](https://github.com/fastpresspages/contextpack) — Token-budgeted codebase context packer for LLMs.
- [FastPress Skills](https://github.com/fastpresspages/skills) — Installable agent skills for shipping, scanning, and inbox triage.
- [FastPress Start](https://fastpresspages.github.io/fastpress-start/) — Zero-build launch page template rated A+ 100/100.

---

## License

Apache-2.0. Copyright (c) 2026 FastPress Labs.
