const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { server, DATA_PATH } = require('../app');

let base;
let cookie = '';

function reset() {
  fs.copyFileSync(path.join(__dirname, '..', 'data', 'seed.json'), DATA_PATH);
}

// esta función simula un login de usuario y guarda la cookie de sesión para usarla en las siguientes peticiones
async function login(email = 'alice@example.local', password = 'alice123') {
  const body = new URLSearchParams({ email, password });
  const res = await fetch(base + '/login', { method: 'POST', body, redirect: 'manual' });
  cookie = res.headers.get('set-cookie').split(';')[0];
  return res;
}

// antes de ejecutar los tests, reseteamos la base de datos y levantamos el servidor en un puerto aleatorio
test.before(async () => {
  reset();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

// antes de cada test, reseteamos la base de datos y limpiamos la cookie de sesión
test('requiere login', async () => {
  const res = await fetch(base + '/api/evidence');
  assert.equal(res.status, 401);
});

// después de cada test, reseteamos la base de datos y limpiamos la cookie de sesión
test('alice lista solo sus evidencias', async () => {
  await login();
  const res = await fetch(base + '/api/evidence', { headers: { cookie } });
  assert.equal(res.status, 200);
  const rows = await res.json();
  assert.deepEqual(rows.map(r => r.id), [101, 102]);
});

test('download inicia sin implementar', async () => {
  await login();
  const res = await fetch(base + '/api/evidence/101/download', { headers: { cookie } });
  assert.equal(res.status, 501);
});
