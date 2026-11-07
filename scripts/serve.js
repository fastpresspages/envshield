// Zero-dependency local static HTTP server for EnvShield site
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const siteDir = resolve(__dirname, '..', 'site');
const port = Number(process.argv[2] || 8126);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.json': 'application/json',
  '.md': 'text/markdown; charset=utf-8',
};

const server = createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  let filePath = join(siteDir, urlPath === '/' ? 'index.html' : urlPath);

  if (!filePath.startsWith(siteDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (existsSync(filePath)) {
    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    let content = readFileSync(filePath);

    const headers = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=600',
    };

    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (acceptEncoding.includes('gzip') && content.length > 512 && ext !== '.png') {
      headers['Content-Encoding'] = 'gzip';
      content = gzipSync(content);
    }

    res.writeHead(200, headers);
    res.end(content);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    const notFoundPath = join(siteDir, '404.html');
    res.end(existsSync(notFoundPath) ? readFileSync(notFoundPath) : '404 Not Found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`EnvShield local server running at http://127.0.0.1:${port}/`);
});
