const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const querystring = require('querystring');

const ROOT = __dirname;
const DATA_PATH = path.join(ROOT, 'data', 'lab.json');
const PUBLIC = path.join(ROOT, 'public');
const EVIDENCE_DIR = path.join(ROOT, 'evidence-files');
const PORT = Number(process.env.PORT || 5000);
const HOST = process.env.HOST || '127.0.0.1';

const sessions = new Map();

function readDb() {
  return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}
function writeDb(db) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));
}
function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}
function json(res, status, obj, headers = {}) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8', ...headers });
}
function html(res, status, body, headers = {}) {
  send(res, status, body, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
}
function parseCookies(req) {
  const raw = req.headers.cookie || '';
  return Object.fromEntries(raw.split(';').filter(Boolean).map(part => {
    const i = part.indexOf('=');
    const k = (i >= 0 ? part.slice(0, i) : part).trim();
    const v = i >= 0 ? part.slice(i + 1).trim() : '';
    return [k, decodeURIComponent(v)];
  }));
}
function currentUser(req) {
  const sid = parseCookies(req).session;
  if (!sid) return null;
  const userId = sessions.get(sid);
  if (!userId) return null;
  return readDb().users.find(u => u.id === userId) || null;
}
function requireAuth(req, res) {
  const user = currentUser(req);
  if (!user) {
    json(res, 401, { error: 'authentication required' });
    return null;
  }
  return user;
}
function body(req) {
  return new Promise((resolve, reject) => {
    let chunks = '';
    req.on('data', c => { chunks += c; if (chunks.length > 1_000_000) req.destroy(); });
    req.on('end', () => resolve(chunks));
    req.on('error', reject);
  });
}
function escapeHtml(s) {
  return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function loginPage(error = '') {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EvidenceHub - Login</title><link rel="stylesheet" href="/static/style.css"></head><body><main class="card narrow"><h1>EvidenceHub</h1><p>Laboratorio local de VibeCoding Seguro.</p>${error ? `<p class="error">${escapeHtml(error)}</p>` : ''}<form method="post"><label>Correo<input name="email" value="alice@example.local" required></label><label>Contraseña<input name="password" type="password" value="alice123" required></label><button type="submit">Entrar</button></form></main></body></html>`;
}
function indexPage(user) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EvidenceHub</title><link rel="stylesheet" href="/static/style.css"></head><body><header><div><strong>EvidenceHub</strong><span>Entrenamiento local</span></div><div>${escapeHtml(user.email)} · ${escapeHtml(user.role)} <form method="post" action="/logout" class="inline"><button>Salir</button></form></div></header><main class="layout"><section class="card"><h2>Mis evidencias</h2><p>Selecciona un registro para ver su detalle.</p><div id="items">Cargando...</div></section><section class="card"><h2>Detalle</h2><pre id="detail">Sin selección</pre><button id="download" disabled>Descargar evidencia</button><p class="hint">La descarga se implementará durante el Día 2.</p></section></main><script src="/static/app.js"></script></body></html>`;
}
function staticFile(res, file) {
  if (!fs.existsSync(file)) return send(res, 404, 'Not found');
  const ext = path.extname(file);
  const types = { '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8' };
  send(res, 200, fs.readFileSync(file), { 'Content-Type': types[ext] || 'application/octet-stream' });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/login') return html(res, 200, loginPage());
  if (req.method === 'POST' && pathname === '/login') {
    const raw = await body(req);
    const form = querystring.parse(raw);
    const db = readDb();
    const user = db.users.find(u => u.email === form.email && u.password === form.password);
    if (!user) return html(res, 401, loginPage('Credenciales inválidas'));
    const sid = crypto.randomBytes(18).toString('hex');
    sessions.set(sid, user.id);
    return send(res, 302, '', { 'Location': '/', 'Set-Cookie': `session=${sid}; Path=/; HttpOnly; SameSite=Lax` });
  }
  if (req.method === 'POST' && pathname === '/logout') {
    const sid = parseCookies(req).session;
    if (sid) sessions.delete(sid);
    return send(res, 302, '', { 'Location': '/login', 'Set-Cookie': 'session=; Path=/; Max-Age=0' });
  }
  if (req.method === 'GET' && pathname === '/') {
    const user = currentUser(req);
    if (!user) return send(res, 302, '', { Location: '/login' });
    return html(res, 200, indexPage(user));
  }
  if (req.method === 'GET' && pathname.startsWith('/static/')) {
    const name = path.basename(pathname);
    return staticFile(res, path.join(PUBLIC, name));
  }

  if (req.method === 'GET' && pathname === '/api/me') {
    const user = requireAuth(req, res); if (!user) return;
    return json(res, 200, { id: user.id, email: user.email, role: user.role });
  }
  if (req.method === 'GET' && pathname === '/api/evidence') {
    const user = requireAuth(req, res); if (!user) return;
    const rows = readDb().evidence.filter(e => e.owner_id === user.id).map(({id,title,classification}) => ({id,title,classification}));
    return json(res, 200, rows);
  }

  let match = pathname.match(/^\/api\/evidence\/(\d+)$/);
  if (req.method === 'GET' && match) {
    const user = requireAuth(req, res); if (!user) return;
    const evidenceId = Number(match[1]);
    // LAB D1: autenticación existe, pero la autorización por recurso está incompleta.
    const row = readDb().evidence.find(e => e.id === evidenceId);
    if (!row) return json(res, 404, { error: 'not found' });
    return json(res, 200, row);
  }
  if (req.method === 'PATCH' && match) {
    const user = requireAuth(req, res); if (!user) return;
    const evidenceId = Number(match[1]);
    const payload = JSON.parse((await body(req)) || '{}');
    const db = readDb();
    const row = db.evidence.find(e => e.id === evidenceId);
    if (!row) return json(res, 404, { error: 'not found' });
    if (row.owner_id !== user.id) return json(res, 403, { error: 'forbidden' });
    // LAB challenge: ownership correcto, validación de datos mínima.
    if (payload.title !== undefined) row.title = payload.title;
    if (payload.classification !== undefined) row.classification = payload.classification;
    writeDb(db);
    return json(res, 200, { status: 'updated' });
  }

  if (req.method === 'PATCH' && pathname === '/api/profile') {
    const user = requireAuth(req, res); if (!user) return;
    const payload = JSON.parse((await body(req)) || '{}');
    // LAB challenge: mass assignment de un campo sensible.
    if (payload.role) {
      const db = readDb();
      const target = db.users.find(u => u.id === user.id);
      target.role = payload.role;
      writeDb(db);
    }
    const refreshed = currentUser(req);
    return json(res, 200, { status: 'updated', role: refreshed.role });
  }

  if (req.method === 'GET' && pathname === '/api/admin/summary') {
    const user = requireAuth(req, res); if (!user) return;
    if (user.role !== 'admin') return json(res, 403, { error: 'forbidden' });
    const db = readDb();
    return json(res, 200, { users: db.users.length, evidence: db.evidence.length });
  }

  match = pathname.match(/^\/api\/evidence\/(\d+)\/download$/);
  if (req.method === 'GET' && match) {
    const user = requireAuth(req, res); if (!user) return;
    const evidenceId = Number(match[1]);
    // LAB D2: esta funcionalidad se implementará durante el taller.
    return json(res, 501, { error: 'feature not implemented', evidence_id: evidenceId });
  }

  if (req.method === 'GET' && pathname === '/api/debug') {
    const user = requireAuth(req, res); if (!user) return;
    // LAB bonus: información interna innecesaria expuesta a cualquier usuario autenticado.
    return json(res, 200, { data_file: path.resolve(DATA_PATH), app_root: ROOT, node: process.version });
  }

  return json(res, 404, { error: 'not found' });
});

if (require.main === module) {
  if (!fs.existsSync(DATA_PATH)) fs.copyFileSync(path.join(ROOT, 'data', 'seed.json'), DATA_PATH);
  server.listen(PORT, HOST, () => {
    console.log(`EvidenceHub listo en http://${HOST}:${PORT}`);
    console.log('Usuarios: alice@example.local/alice123 | bob@example.local/bob123 | analyst@example.local/analyst123');
  });
}

module.exports = { server, readDb, writeDb, DATA_PATH };
