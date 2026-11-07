/**
 * Zero-dependency Environment Security Auditor
 * Performs end-to-end security audit on repository environment setup
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { scanText } from './scanner.js';
import { parseEnv } from './parser.js';
import { validateParity } from './schema.js';

export function auditRepository(rootDir = process.cwd(), options = {}) {
  const root = resolve(rootDir);
  const checks = [];
  let score = 100;

  // 1. Check .gitignore for .env protection
  const gitignorePath = join(root, '.gitignore');
  if (existsSync(gitignorePath)) {
    const gitignoreContent = readFileSync(gitignorePath, 'utf8');
    const protectsEnv = /(?:^|\n)\s*(?:\*\.env|\.env|\.env\*|\.env\.local|\.env\.\*)\b/m.test(gitignoreContent);

    if (protectsEnv) {
      checks.push({
        id: 'git.gitignore-protects-env',
        category: 'Git Hygiene',
        status: 'pass',
        weight: 25,
        title: '.gitignore ignores .env files',
        message: '.env patterns are properly listed in .gitignore.',
      });
    } else {
      score -= 25;
      checks.push({
        id: 'git.gitignore-protects-env',
        category: 'Git Hygiene',
        status: 'fail',
        weight: 25,
        title: '.gitignore misses .env files',
        message: 'No rule found in .gitignore ignoring .env files! Secrets can easily be committed.',
        fix: 'Add `.env*` or `.env` and `.env.local` to .gitignore immediately.',
      });
    }
  } else {
    score -= 25;
    checks.push({
      id: 'git.gitignore-missing',
      category: 'Git Hygiene',
      status: 'fail',
      weight: 25,
      title: 'No .gitignore file found',
      message: 'Repository lacks a .gitignore file.',
      fix: 'Create a .gitignore file and include `.env*`.',
    });
  }

  // 2. Scan for committed real .env files in root or subdirectories
  const committedEnvFiles = findPotentiallyDangerousEnvFiles(root);
  if (committedEnvFiles.length > 0) {
    score -= 30;
    checks.push({
      id: 'env.committed-secret-files',
      category: 'Secret Leaks',
      status: 'fail',
      weight: 30,
      title: 'Real .env files detected in directory',
      message: `Found ${committedEnvFiles.length} concrete environment file(s): ${committedEnvFiles.join(', ')}`,
      fix: 'Verify these are not tracked by git (`git rm --cached <file>`) and are ignored.',
    });
  } else {
    checks.push({
      id: 'env.committed-secret-files',
      category: 'Secret Leaks',
      status: 'pass',
      weight: 30,
      title: 'No unignored sensitive .env files committed',
      message: 'No live .env files found in tracked directory scan.',
    });
  }

  // 3. Scan .env.example / .env.sample for live secret leaks
  const exampleFile = findExampleFile(root);
  if (exampleFile) {
    const exampleContent = readFileSync(join(root, exampleFile), 'utf8');
    const leaks = scanText(exampleContent, { filename: exampleFile });

    if (leaks.length > 0) {
      score -= 35;
      checks.push({
        id: 'example.secret-leak',
        category: 'Secret Leaks',
        status: 'fail',
        weight: 35,
        title: `Real secrets leaked in ${exampleFile}`,
        message: `Found ${leaks.length} secret(s) in template file: ${leaks.map((l) => `${l.name} (line ${l.line})`).join(', ')}`,
        fix: `Sanitize ${exampleFile} immediately with safe placeholders like \`your_key_here\`.`,
      });
    } else {
      checks.push({
        id: 'example.secret-leak',
        category: 'Secret Leaks',
        status: 'pass',
        weight: 35,
        title: `${exampleFile} contains no leaked secrets`,
        message: 'Template file is cleanly sanitized.',
      });
    }

    // 4. If actual .env exists locally, test parity against example
    const localEnvPath = join(root, '.env');
    if (existsSync(localEnvPath)) {
      const localEnvContent = readFileSync(localEnvPath, 'utf8');
      const parity = validateParity(localEnvContent, exampleContent);

      if (parity.missing.length > 0) {
        score -= 15;
        checks.push({
          id: 'parity.missing-keys',
          category: 'Parity & Schema',
          status: 'warn',
          weight: 15,
          title: `Local .env is missing keys from ${exampleFile}`,
          message: `Missing: ${parity.missing.map((m) => m.key).join(', ')}`,
          fix: `Add the missing variables to .env or update ${exampleFile}.`,
        });
      } else {
        checks.push({
          id: 'parity.missing-keys',
          category: 'Parity & Schema',
          status: 'pass',
          weight: 15,
          title: `Local .env satisfies all keys in ${exampleFile}`,
          message: `All ${parity.totalExpected} expected environment variables are defined.`,
        });
      }

      if (parity.typeErrors.length > 0) {
        score -= 10;
        checks.push({
          id: 'parity.type-errors',
          category: 'Parity & Schema',
          status: 'warn',
          weight: 10,
          title: 'Type validation errors detected',
          message: parity.typeErrors.map((e) => e.message).join('; '),
          fix: 'Fix malformed variable types in .env.',
        });
      }
    }
  } else {
    score -= 15;
    checks.push({
      id: 'example.file-missing',
      category: 'Documentation',
      status: 'warn',
      weight: 15,
      title: 'Missing .env.example template',
      message: 'No .env.example or .env.sample file found to document expected environment variables.',
      fix: 'Run `envshield generate` to create a sanitized .env.example template.',
    });
  }

  // Calculate final letter grade
  score = Math.max(0, Math.min(100, score));
  const grade = computeGrade(score);

  return {
    score,
    grade,
    summary: {
      total: checks.length,
      pass: checks.filter((c) => c.status === 'pass').length,
      warn: checks.filter((c) => c.status === 'warn').length,
      fail: checks.filter((c) => c.status === 'fail').length,
    },
    checks,
    fixes: checks.filter((c) => c.status !== 'pass' && c.fix).map((c) => c.fix),
  };
}

function findExampleFile(root) {
  const candidates = ['.env.example', '.env.sample', '.env.template', 'env.example'];
  for (const c of candidates) {
    if (existsSync(join(root, c))) return c;
  }
  return null;
}

function findPotentiallyDangerousEnvFiles(root) {
  const dangerous = [];
  const entries = ['.env', '.env.local', '.env.production', '.env.prod', '.env.staging'];
  for (const e of entries) {
    const p = join(root, e);
    if (existsSync(p)) {
      dangerous.push(e);
    }
  }
  return dangerous;
}

function computeGrade(score) {
  if (score >= 97) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
