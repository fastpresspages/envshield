// Zero-dependency internal link checker
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const siteDir = resolve(__dirname, '..', 'site');

const htmlFiles = readdirSync(siteDir).filter((f) => f.endsWith('.html'));
let bad = 0;
let total = 0;

for (const page of htmlFiles) {
  const content = readFileSync(join(siteDir, page), 'utf8');
  const matches = [...content.matchAll(/(?:href|src)="([^"#]+?)(?:#[^"]*)?"/g)].map((m) => m[1]);

  const seen = new Set();
  for (const ref of matches) {
    if (seen.has(ref)) continue;
    seen.add(ref);

    // Skip external and special links
    if (/^(https?:)?\/\//i.test(ref) || ref.startsWith('mailto:') || ref.startsWith('data:')) {
      continue;
    }

    total++;
    const cleanRef = ref.split('?')[0];
    const targetPath = resolve(siteDir, cleanRef);

    if (!targetPath.startsWith(siteDir) || !existsSync(targetPath)) {
      bad++;
      console.error(`BROKEN in ${page}: ${ref}`);
    }
  }
}

console.log(`${total - bad}/${total} internal refs OK across ${htmlFiles.length} pages`);
process.exit(bad ? 1 : 0);
