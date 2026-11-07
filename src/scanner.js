/**
 * Zero-dependency Secret and Leak Scanner
 * Combines high-precision regex signatures with Shannon entropy analysis
 */

// Secret regex signatures
export const SECRET_RULES = [
  {
    id: 'aws.access-key',
    name: 'AWS Access Key ID',
    severity: 'high',
    regex: /\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    id: 'aws.secret-key',
    name: 'AWS Secret Access Key',
    severity: 'high',
    regex: /(?:aws_secret_access_key|aws_secret_key|secret_key|secret_access_key)\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,
    captureGroup: 1,
  },
  {
    id: 'github.pat',
    name: 'GitHub Personal Access Token',
    severity: 'high',
    regex: /\b(ghp_[0-9a-zA-Z]{30,40}|github_pat_[0-9a-zA-Z_]{70,90}|gho_[0-9a-zA-Z]{30,40}|ghu_[0-9a-zA-Z]{30,40}|ghs_[0-9a-zA-Z]{30,40}|ghr_[0-9a-zA-Z]{30,40})\b/g,
  },
  {
    id: 'openai.api-key',
    name: 'OpenAI API Key',
    severity: 'high',
    regex: /\bsk-(?:proj-|admin-|live-)?[a-zA-Z0-9_-]{32,80}\b/g,
  },
  {
    id: 'anthropic.api-key',
    name: 'Anthropic API Key',
    severity: 'high',
    regex: /\bsk-ant-(?:api03|admin)?[a-zA-Z0-9_\-]{32,100}\b/g,
  },
  {
    id: 'google.api-key',
    name: 'Google API / Gemini Key',
    severity: 'high',
    regex: /\bAIza[0-9A-Za-z\\-_]{35}\b/g,
  },
  {
    id: 'stripe.api-key',
    name: 'Stripe Secret Key',
    severity: 'high',
    regex: /\b(?:sk_live|rk_live)_[0-9a-zA-Z]{24,34}\b/g,
  },
  {
    id: 'slack.token',
    name: 'Slack Token',
    severity: 'high',
    regex: /\bxox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,34}\b/g,
  },
  {
    id: 'slack.webhook',
    name: 'Slack Webhook URL',
    severity: 'medium',
    regex: /https:\/\/hooks\.slack\.com\/services\/T[0-9A-Z]{8}\/B[0-9A-Z]{8}\/[0-9a-zA-Z]{24}/g,
  },
  {
    id: 'private-key',
    name: 'Private Encryption Key',
    severity: 'high',
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g,
  },
  {
    id: 'jwt.token',
    name: 'JSON Web Token (JWT)',
    severity: 'medium',
    regex: /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g,
  },
  {
    id: 'database.uri-credentials',
    name: 'Database URI with Password',
    severity: 'high',
    regex: /\b(?:postgres|postgresql|mysql|mongodb|mongodb\+srv|redis|amqp|amqps):\/\/[a-zA-Z0-9_.-]+:(?!password\b|pass\b|<password>)[^@\s/]+@[a-zA-Z0-9_.-]+/gi,
  },
  {
    id: 'sendgrid.api-key',
    name: 'SendGrid API Key',
    severity: 'high',
    regex: /\bSG\.[a-zA-Z0-9_\-]{22}\.[a-zA-Z0-9_\-]{43}\b/g,
  },
  {
    id: 'huggingface.token',
    name: 'HuggingFace Access Token',
    severity: 'high',
    regex: /\bhf_[a-zA-Z0-9]{34,}\b/g,
  },
];

/**
 * Calculate Shannon Entropy of a string
 * Measures randomness/information density (bits per character)
 */
export function calculateShannonEntropy(str) {
  if (!str || str.length === 0) return 0;
  const frequencies = {};
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  let entropy = 0;
  const len = str.length;
  for (const count of Object.values(frequencies)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Mask secret string for safe display
 */
export function maskSecret(secret) {
  if (!secret) return '';
  const s = String(secret);
  if (s.length <= 6) return '*'.repeat(s.length);
  return s.slice(0, 3) + '*'.repeat(Math.min(10, s.length - 6)) + s.slice(-3);
}

/**
 * Scan a text content for secrets and leaks
 */
export function scanText(content, options = {}) {
  const { filename = '<anonymous>', minEntropy = 4.2 } = options;
  const leaks = [];
  const lines = content.split(/\r?\n/);

  // 1. Signature-based scanning
  for (let lineNum = 1; lineNum <= lines.length; lineNum++) {
    const line = lines[lineNum - 1];

    for (const rule of SECRET_RULES) {
      const regex = new RegExp(rule.regex.source, rule.regex.flags);
      let match;
      while ((match = regex.exec(line)) !== null) {
        const secretVal = rule.captureGroup ? match[rule.captureGroup] : match[0];
        if (!secretVal) continue;

        // Skip obvious dummy/test values
        if (isDummyValue(secretVal)) continue;

        leaks.push({
          ruleId: rule.id,
          name: rule.name,
          severity: rule.severity,
          filename,
          line: lineNum,
          column: match.index + 1,
          masked: maskSecret(secretVal),
          entropy: Number(calculateShannonEntropy(secretVal).toFixed(2)),
        });
      }
    }

    // 2. High-entropy value check on sensitive key assignments
    const keyMatch = line.match(/^\s*(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*["']?([^"'#\s]+)["']?/);
    if (keyMatch) {
      const key = keyMatch[1];
      const val = keyMatch[2];

      if (isSensitiveKeyName(key) && val.length >= 16 && !isDummyValue(val)) {
        const entropy = calculateShannonEntropy(val);
        if (entropy >= minEntropy) {
          const alreadyMatched = leaks.some((l) => l.line === lineNum);
          if (!alreadyMatched) {
            leaks.push({
              ruleId: 'generic.high-entropy-secret',
              name: `High-Entropy Secret in ${key}`,
              severity: 'medium',
              filename,
              line: lineNum,
              column: line.indexOf(val) + 1,
              masked: maskSecret(val),
              entropy: Number(entropy.toFixed(2)),
            });
          }
        }
      }
    }
  }

  return leaks;
}

function isSensitiveKeyName(key) {
  const k = key.toUpperCase();
  return (
    k.includes('SECRET') ||
    k.includes('PASSWORD') ||
    k.includes('PASS') ||
    k.includes('TOKEN') ||
    k.includes('API_KEY') ||
    k.includes('APIKEY') ||
    k.includes('AUTH') ||
    k.includes('PRIVATE_KEY') ||
    k.includes('CREDENTIAL') ||
    k.includes('ACCESS_KEY')
  );
}

function isDummyValue(val) {
  const v = val.toLowerCase();
  return (
    v === 'your_secret_here' ||
    v === 'your-api-key' ||
    v === 'your_api_key' ||
    v === 'change_me' ||
    v === 'changeme' ||
    v === 'placeholder' ||
    v === 'xxx' ||
    v === 'test' ||
    v === 'password' ||
    v === 'secret' ||
    v === 'example' ||
    v.startsWith('dummy') ||
    v.endsWith('dummy') ||
    v.startsWith('pk_test_') ||
    v.startsWith('sk_test_')
  );
}
