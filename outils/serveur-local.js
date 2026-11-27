/* =========================================================
   SI T'ES SHOW — serveur local de prévisualisation
   - sert le site depuis ce dossier, comme Vercel ;
   - exécute les formulaires (/api/...) ;
   - recharge le navigateur automatiquement dès qu'un fichier change.
   Lancement : double-clic sur « lancer-site-local.bat »,
   ou : node outils/serveur-local.js
   Ce fichier n'est pas publié sur Vercel (.vercelignore).
   ========================================================= */
const path = require('path');
const http = require('http');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 5174);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json',
  '.ico': 'image/x-icon'
};

// Variables d'environnement locales facultatives (.env.local, jamais publié)
const envFile = path.join(ROOT, '.env.local');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

/* ---------- Rechargement automatique ---------- */
const clients = new Set();
const RELOAD_SNIPPET = `<script>(()=>{const s=new EventSource('/__reload');s.onmessage=()=>location.reload();})();</script>`;
const IGNORED = /(^|[\\/])(\.git|\.vercel|node_modules|\.claude|\.agents|\.playwright-mcp|images)([\\/]|$)/;
let timer = null;
fs.watch(ROOT, { recursive: true }, (_event, file) => {
  if (!file || IGNORED.test(file)) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    console.log('Modifié :', file, '→ rechargement');
    for (const res of clients) res.write('data: reload\n\n');
  }, 150);
});

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/__reload') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write(': ok\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  /* ---------- Fonctions /api ---------- */
  if (url.pathname.startsWith('/api/')) {
    const name = url.pathname.slice(5).replace(/[^a-z-]/g, '');
    const file = path.join(ROOT, 'api', name + '.js');
    if (!name || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', async () => {
      try { req.body = raw ? JSON.parse(raw) : undefined; } catch { req.body = raw; }
      res.status = (c) => { res.statusCode = c; return res; };
      res.json = (o) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
      try {
        // Recharge le code à chaque appel pour refléter les modifications
        Object.keys(require.cache).filter((k) => k.startsWith(path.join(ROOT, 'api'))).forEach((k) => delete require.cache[k]);
        await require(file)(req, res);
      } catch (err) {
        console.error(err);
        if (!res.headersSent) res.status(500).json({ message: 'Erreur du serveur local : ' + err.message });
      }
      console.log(req.method, url.pathname, res.statusCode);
    });
    return;
  }

  /* ---------- Fichiers statiques ---------- */
  let p = decodeURIComponent(url.pathname);
  if (p.endsWith('/')) p += 'index.html';
  let file = path.join(ROOT, p);
  if (!path.extname(file) && fs.existsSync(file + '.html')) file += '.html';
  if (!file.startsWith(ROOT) || IGNORED.test(path.relative(ROOT, file)) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Page introuvable');
  }
  const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Cache-Control': 'no-store', 'Content-Type': type });
  if (type.startsWith('text/html')) {
    const html = fs.readFileSync(file, 'utf8');
    return res.end(html.includes('</body>') ? html.replace('</body>', RELOAD_SNIPPET + '</body>') : html + RELOAD_SNIPPET);
  }
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => {
  console.log('\n  Site SI T\'ES SHOW en local : http://localhost:' + PORT);
  console.log('  Les pages se rechargent toutes seules à chaque modification.');
  console.log('  Pour arrêter : fermez cette fenêtre (ou Ctrl+C).\n');
});
