# AGENTS.md — Instructions for Autonomous Coding Agents

## What this repository is
EnvShield (`fastpresspages/envshield`): A zero-dependency environment security auditor, secret leak scanner, and schema validator.

## Architecture
- `src/parser.js`: Robust zero-dependency `.env` file parser and stringifier.
- `src/scanner.js`: Secret leak detection with precision regex signatures + Shannon entropy.
- `src/schema.js`: Parity checker and type validator (`number`, `port`, `boolean`, `url`, `email`, `enum`).
- `src/generator.js`: `.env.example` generator with safe placeholder substitution.
- `src/auditor.js`: Repository audit engine computing scores (0-100) and letter grades.
- `bin/envshield.js`: CLI binary (`audit`, `scan`, `check`, `generate`).
- `mcp/server.js`: Stdio JSON-RPC 2.0 MCP server.
- `action.yml`: Composite GitHub Action.

## Strict Rules
- **Zero runtime dependencies:** Never add third-party dependencies to `package.json`. Node >= 18.17 standard library only.
- **Zero telemetry:** Never introduce tracking, analytics, or external network requests.
- **Verification:** Run `npm test` before any commit.
