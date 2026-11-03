import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative, extname, isAbsolute } from 'node:path';

const root = fileURLToPath(new URL('./public/', import.meta.url));
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.jpg':'image/jpeg', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml' };
export function createServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    const send = (status, body, type='text/plain; charset=utf-8') => {
      res.writeHead(status, { 'Content-Type':type, 'Cache-Control':'no-cache', 'Content-Length':Buffer.byteLength(body) });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    if (!['GET','HEAD'].includes(req.method)) { res.setHeader('Allow','GET, HEAD'); return send(405,'Method not allowed'); }
    try {
      const path = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if (path === '/api/health') return send(200, JSON.stringify({status:'ok',app:'拾光',version:'1.0.0'}), 'application/json; charset=utf-8');
      const target = resolve(root, '.' + (path === '/' ? '/index.html' : path));
      const rel = relative(root,target);
      if (isAbsolute(rel) || rel.startsWith('..') || path.includes('\\') || path.includes('\0') || path.split('/').some(part => part.startsWith('.')) || !types[extname(target)]) return send(404,'Not found');
      const data = await readFile(target);
      return send(200,data,types[extname(target)]);
    } catch { return send(404,'Not found'); }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3101);
  const server = createServer();
  server.listen(port,'0.0.0.0',()=>console.log(`拾光已启动，端口 ${port}`));
  const shutdown = () => server.close(()=>process.exit(0));
  process.on('SIGTERM',shutdown); process.on('SIGINT',shutdown);
}
