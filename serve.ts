// STORM SURGE — serve.ts: local static server for playtesting.
// Serves game/ at http://localhost:8080 (or --port N). Dev tool only;
// the entry itself is plain static files under game/.
// Usage: node serve.ts [--port 8080]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const root = join(here, 'game');
const port = parseInt(process.argv[process.argv.indexOf('--port') + 1] || '8080', 10);
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
};

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
  const file = join(root, path === '' ? 'index.html' : path);
  if (!file.startsWith(root) || !existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
});
server.listen(port, '127.0.0.1', () => {
  console.log(`STORM SURGE at http://localhost:${port} (game/index.html)`);
});
