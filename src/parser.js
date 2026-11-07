/**
 * Zero-dependency .env parser and stringifier
 * Supports quotes, multi-line values, inline comments, variable expansion, export keyword
 */

export function parseEnv(content) {
  const parsed = {};
  const comments = {};
  const lines = content.split(/\r?\n/);

  let currentKey = null;
  let currentValue = '';
  let inMultiLine = false;
  let quoteChar = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (inMultiLine) {
      // Continue multiline value
      const closingIndex = rawLine.indexOf(quoteChar);
      if (closingIndex !== -1) {
        currentValue += '\n' + rawLine.slice(0, closingIndex);
        parsed[currentKey] = unescapeString(currentValue, quoteChar);
        inMultiLine = false;
        currentKey = null;
        currentValue = '';
        quoteChar = null;
      } else {
        currentValue += '\n' + rawLine;
      }
      continue;
    }

    // Ignore empty lines
    if (!line) continue;

    // Comments
    if (line.startsWith('#')) {
      const nextKeyCandidate = findNextKey(lines, i + 1);
      if (nextKeyCandidate) {
        comments[nextKeyCandidate] = (comments[nextKeyCandidate] || []).concat(line.slice(1).trim());
      }
      continue;
    }

    // Strip optional "export " prefix
    let cleanLine = line;
    if (cleanLine.startsWith('export ')) {
      cleanLine = cleanLine.slice(7).trim();
    }

    // Match KEY=VALUE
    const equalIdx = cleanLine.indexOf('=');
    if (equalIdx === -1) {
      continue; // Malformed line or bare key
    }

    const key = cleanLine.slice(0, equalIdx).trim();
    if (!isValidKey(key)) continue;

    let val = cleanLine.slice(equalIdx + 1).trim();

    // Check quotes
    if (val.startsWith('"') || val.startsWith("'") || val.startsWith('`')) {
      quoteChar = val[0];
      const endQuoteIdx = val.indexOf(quoteChar, 1);
      if (endQuoteIdx !== -1) {
        // Closed on the same line
        parsed[key] = unescapeString(val.slice(1, endQuoteIdx), quoteChar);
      } else {
        // Multi-line start
        inMultiLine = true;
        currentKey = key;
        currentValue = val.slice(1);
      }
    } else {
      // Unquoted value: strip inline comments
      const commentIdx = val.indexOf('#');
      if (commentIdx !== -1) {
        val = val.slice(0, commentIdx).trim();
      }
      parsed[key] = val;
    }
  }

  return { parsed, comments };
}

function isValidKey(key) {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key);
}

function unescapeString(str, quoteChar) {
  if (quoteChar === '"') {
    return str
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  return str;
}

function findNextKey(lines, startIdx) {
  for (let j = startIdx; j < lines.length; j++) {
    const l = lines[j].trim();
    if (l && !l.startsWith('#')) {
      let candidate = l.startsWith('export ') ? l.slice(7).trim() : l;
      const eq = candidate.indexOf('=');
      if (eq !== -1) return candidate.slice(0, eq).trim();
    }
  }
  return null;
}

/**
 * Format an object back to clean .env syntax
 */
export function formatEnv(obj, options = {}) {
  const { comments = {}, sanitize = false } = options;
  const lines = [];

  for (const [key, rawVal] of Object.entries(obj)) {
    if (comments[key]) {
      for (const c of comments[key]) {
        lines.push(`# ${c}`);
      }
    }
    const val = sanitize ? '' : String(rawVal);
    if (val.includes('\n') || val.includes(' ') || val.includes('#')) {
      lines.push(`${key}="${val.replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`${key}=${val}`);
    }
  }

  return lines.join('\n') + '\n';
}
