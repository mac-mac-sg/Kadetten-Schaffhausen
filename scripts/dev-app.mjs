// Lokale, schreibgeschützte Vorschau der Kadetten Companion App auf http://127.0.0.1:3001.
// Baut src/kadetten nach dist/app und liefert /api/* über denselben lokalen Adapter wie scripts/dev.mjs.
import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {resolve, sep, extname} from 'node:path';
import worker from '../server/worker.mjs';
import {buildApp} from './build-app.mjs';

await buildApp({outDir: 'dist/app-dev', target: ''});
const root = resolve('dist/app-dev'), dataRoot = resolve('.local-data');
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml'};
const inside = (base, path) => { const p = resolve(base, path); if (p !== base && !p.startsWith(base + sep)) throw Error('Invalid path'); return p; };
const env = {
  BUCKET: {
    async get(key) { try { const text = await readFile(inside(dataRoot, key), 'utf8'); return {json: async () => JSON.parse(text)}; } catch (e) { if (e.code === 'ENOENT') return null; throw e; } },
    async put() { throw Error('Read-only preview'); }
  }
};
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1:3001');
    if (url.pathname.startsWith('/api/')) {
      if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
      const response = await worker.fetch(new Request(url, {method: 'GET'}), env);
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer())); return;
    }
    let path = inside(root, decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html');
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    res.writeHead(200, {'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache'}); res.end(await readFile(path));
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(3001, '127.0.0.1', () => console.log('Kadetten-App lokal: http://127.0.0.1:3001 (schreibgeschützt)'));
