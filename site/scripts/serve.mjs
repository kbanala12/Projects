// Serves dist/ under the production base path so the build can be checked
// exactly as GitHub Pages will serve it. Usage: node scripts/serve.mjs [port]
import http from 'node:http';
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { SITE_DIR, loadProjects } from './lib.mjs';

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain' };

export function serve(port = 4173, base = loadProjects().site.basePath) {
  const dist = path.join(SITE_DIR, 'dist');
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith(base)) {
      res.writeHead(404);
      return res.end('outside base path');
    }
    let rel = decodeURIComponent(url.pathname.slice(base.length));
    let file = path.join(dist, rel);
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!url.pathname.endsWith('/')) {
        res.writeHead(301, { Location: url.pathname + '/' });
        return res.end();
      }
      file = path.join(file, 'index.html');
    }
    if (!fs.existsSync(file)) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      return res.end(fs.readFileSync(path.join(dist, '404.html')));
    }
    const type = TYPES[path.extname(file)] || 'application/octet-stream';
    const gz = /^(text\/|application\/(javascript|json|xml)|image\/svg)/.test(type) && /gzip/.test(req.headers['accept-encoding'] || '');
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'max-age=600', ...(gz ? { 'Content-Encoding': 'gzip' } : {}) });
    const stream = fs.createReadStream(file);
    gz ? stream.pipe(zlib.createGzip()).pipe(res) : stream.pipe(res);
  });
  return new Promise((resolve) => server.listen(port, () => resolve({ server, url: `http://localhost:${port}${base}` })));
}

if (process.argv[1] && path.resolve(process.argv[1]).endsWith('serve.mjs')) {
  const { url } = await serve(+(process.argv[2] || 4173));
  console.log(`[site] serving dist at ${url}`);
}
