#!/usr/bin/env node

/**
 * EnvShield CLI — Zero-dependency environment security and leak auditor
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { auditRepository } from '../src/auditor.js';
import { scanText } from '../src/scanner.js';
import { validateParity } from '../src/schema.js';
import { generateExample } from '../src/generator.js';

const VERSION = '0.1.0';

function printHelp() {
  console.log(`
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
  -v, --version             Print version (${VERSION})
  -h, --help                Show this help message

Examples:
  envshield audit . --fail-under 80
  envshield scan .env.example
  envshield check .env --example .env.example
  envshield generate .env -o .env.example
`);
}

function parseArgs(args) {
  const flags = {
    command: 'audit',
    target: '.',
    failUnder: 0,
    format: 'terminal',
    out: null,
    example: null,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '-h' || a === '--help') {
      flags.help = true;
    } else if (a === '-v' || a === '--version') {
      flags.version = true;
    } else if (a === '--fail-under') {
      flags.failUnder = Number(args[++i] || 0);
    } else if (a === '--format') {
      flags.format = args[++i] || 'terminal';
    } else if (a === '-o' || a === '--out') {
      flags.out = args[++i];
    } else if (a === '--example' || a === '-e') {
      flags.example = args[++i];
    } else if (a.startsWith('-')) {
      // unknown flag
    } else {
      if (['audit', 'scan', 'check', 'generate'].includes(a)) {
        flags.command = a;
      } else {
        flags.target = a;
      }
    }
  }

  return flags;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));

  if (flags.help) {
    printHelp();
    process.exit(0);
  }

  if (flags.version) {
    console.log(`envshield v${VERSION}`);
    process.exit(0);
  }

  const cwd = process.cwd();

  if (flags.command === 'generate') {
    const targetFile = flags.target !== '.' ? flags.target : '.env';
    const filePath = resolve(cwd, targetFile);

    if (!existsSync(filePath)) {
      console.error(`Error: File not found: ${targetFile}`);
      process.exit(1);
    }

    const content = readFileSync(filePath, 'utf8');
    const example = generateExample(content);

    if (flags.out) {
      writeFileSync(resolve(cwd, flags.out), example, 'utf8');
      console.log(`Created sanitized template at: ${flags.out}`);
    } else {
      process.stdout.write(example);
    }
    process.exit(0);
  }

  if (flags.command === 'check') {
    const envFile = flags.target !== '.' ? flags.target : '.env';
    const exampleFile = flags.example || '.env.example';

    const envPath = resolve(cwd, envFile);
    const exPath = resolve(cwd, exampleFile);

    if (!existsSync(envPath)) {
      console.error(`Error: .env file not found: ${envFile}`);
      process.exit(1);
    }
    if (!existsSync(exPath)) {
      console.error(`Error: .env.example file not found: ${exampleFile}`);
      process.exit(1);
    }

    const envContent = readFileSync(envPath, 'utf8');
    const exContent = readFileSync(exPath, 'utf8');
    const parity = validateParity(envContent, exContent);

    if (flags.format === 'json') {
      console.log(JSON.stringify(parity, null, 2));
    } else {
      console.log(`\nEnvShield Parity Check: ${envFile} vs ${exampleFile}`);
      console.log(`Status: ${parity.valid ? 'PASS' : 'FAIL'}`);
      console.log(`Expected keys: ${parity.totalExpected} | Actual keys: ${parity.totalActual}`);

      if (parity.missing.length > 0) {
        console.log(`\nMissing variables (${parity.missing.length}):`);
        for (const m of parity.missing) {
          console.log(`  - ${m.key} (${m.expectedType})`);
        }
      }

      if (parity.typeErrors.length > 0) {
        console.log(`\nType errors (${parity.typeErrors.length}):`);
        for (const e of parity.typeErrors) {
          console.log(`  - ${e.message}`);
        }
      }

      if (parity.extra.length > 0) {
        console.log(`\nUndocumented extra variables (${parity.extra.length}):`);
        console.log(`  ${parity.extra.join(', ')}`);
      }
    }

    process.exit(parity.valid ? 0 : 1);
  }

  if (flags.command === 'scan') {
    const targetPath = resolve(cwd, flags.target);
    if (!existsSync(targetPath)) {
      console.error(`Error: Target not found: ${flags.target}`);
      process.exit(1);
    }

    const content = readFileSync(targetPath, 'utf8');
    const leaks = scanText(content, { filename: flags.target });

    if (flags.format === 'json') {
      console.log(JSON.stringify({ target: flags.target, leaksFound: leaks.length, leaks }, null, 2));
    } else {
      console.log(`\nEnvShield Leak Scan: ${flags.target}`);
      if (leaks.length === 0) {
        console.log('No leaked secrets or credentials detected.');
      } else {
        console.log(`FOUND ${leaks.length} LEAK(S):`);
        for (const l of leaks) {
          console.log(`  [${l.severity.toUpperCase()}] Line ${l.line}: ${l.name} (${l.masked})`);
        }
      }
    }
    process.exit(leaks.length === 0 ? 0 : 1);
  }

  // Default: audit
  const targetDir = resolve(cwd, flags.target);
  const result = auditRepository(targetDir);

  if (flags.format === 'json') {
    const out = JSON.stringify(result, null, 2);
    if (flags.out) writeFileSync(resolve(cwd, flags.out), out, 'utf8');
    else console.log(out);
  } else if (flags.format === 'markdown') {
    const md = formatMarkdownReport(result);
    if (flags.out) writeFileSync(resolve(cwd, flags.out), md, 'utf8');
    else console.log(md);
  } else {
    printTerminalReport(result);
  }

  if (flags.failUnder > 0 && result.score < flags.failUnder) {
    console.error(`\nAudit failed: score ${result.score} is below --fail-under ${flags.failUnder}`);
    process.exit(2);
  }

  process.exit(result.summary.fail > 0 ? 1 : 0);
}

function printTerminalReport(res) {
  console.log(`\n======================================================`);
  console.log(`  EnvShield Security Audit  ·  Grade: ${res.grade} (${res.score}/100)`);
  console.log(`======================================================`);
  console.log(`Checks: ${res.summary.pass} pass  |  ${res.summary.warn} warn  |  ${res.summary.fail} fail\n`);

  for (const c of res.checks) {
    const tag = c.status === 'pass' ? '[PASS]' : c.status === 'warn' ? '[WARN]' : '[FAIL]';
    console.log(`${tag} ${c.title}`);
    console.log(`       ${c.message}`);
    if (c.fix) {
      console.log(`       Fix: ${c.fix}`);
    }
  }
}

function formatMarkdownReport(res) {
  return `# EnvShield Audit Report

**Grade:** ${res.grade} (${res.score}/100)  
**Checks:** ${res.summary.pass} passed, ${res.summary.warn} warnings, ${res.summary.fail} failed

## Checks Summary

| Status | Category | Title | Details |
| --- | --- | --- | --- |
${res.checks.map((c) => `| ${c.status.toUpperCase()} | ${c.category} | ${c.title} | ${c.message} |`).join('\n')}

${res.fixes.length > 0 ? `## Recommended Fixes\n\n${res.fixes.map((f, i) => `${i + 1}. ${f}`).join('\n')}` : ''}
`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
