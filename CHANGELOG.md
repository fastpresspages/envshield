# Changelog

All notable changes to `envshield` will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-26
### Added
- Zero-dependency .env parser supporting quotes, multiline values, and comments.
- Secret and credential leak scanner with Shannon entropy analysis and precision regex signatures for AWS, GitHub PAT, OpenAI, Anthropic, Stripe, Slack, DB URIs, and private keys.
- Schema and parity validator between `.env` and `.env.example` templates.
- Automatic `.env.example` sanitizer and generator.
- CLI executable with `audit`, `scan`, `check`, and `generate` subcommands.
- Stdio JSON-RPC 2.0 MCP server (`envshield-mcp`).
- Composite GitHub Action with score and status step outputs.
- Comprehensive test suite (28 tests across 7 test suites).
