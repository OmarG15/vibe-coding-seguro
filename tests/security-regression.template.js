const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { server, DATA_PATH } = require('../app');

let base;

function reset() {
  fs.copyFileSync(path.join(__dirname, '..', 'data', 'seed.json'), DATA_PATH);
}

async function login(email, password) {
  const credentials = new URLSearchParams({ email, password });
  const response = await fetch(base + '/login', {
    method: 'POST',
    body: credentials,
    redirect: 'manual'
  });
  return response.headers.get('set-cookie').split(';')[0];
}

test.before(async () => {
  reset();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

test('un usuario no puede leer evidencia de otro usuario', async () => {
  const cookie = await login('alice@example.local', 'alice123');
  const response = await fetch(base + '/api/evidence/201', {
    headers: { cookie }
  });

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: 'forbidden' });
});

test('un usuario puede leer su propia evidencia', async () => {
  const cookie = await login('alice@example.local', 'alice123');
  const response = await fetch(base + '/api/evidence/101', {
    headers: { cookie }
  });

  assert.equal(response.status, 200);
  assert.equal((await response.json()).id, 101);
});
