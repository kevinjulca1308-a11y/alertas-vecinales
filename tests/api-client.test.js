import test from 'node:test';
import assert from 'node:assert/strict';
import { createApiClient } from '../src/api-client.js';

const healthy = { status: 200, data: { ok: true, database: 'Firestore' } };

test('a waking server retries only health checks and shares startup between parallel requests', async () => {
  let time = 0, probes = 0;
  const requests = [];
  const client = createApiClient({ now: () => time, sleep: async (ms) => { time += ms; }, request: async (path, options) => {
    requests.push({ path, method: options.method || 'GET' });
    if (path === '/health') return ++probes < 3 ? { status: 503, data: null } : healthy;
    return { status: 200, data: { path } };
  } });
  const values = await Promise.all([client.call('/reports'), client.call('/me')]);
  assert.equal(probes, 3);
  assert.equal(values.length, 2);
  assert.deepEqual(requests.filter((r) => r.path !== '/health').map((r) => r.path).sort(), ['/me', '/reports']);
});

test('a failed mutation is never retried even if its outcome is ambiguous', async () => {
  let mutations = 0;
  const client = createApiClient({ request: async (path) => {
    if (path === '/health') return healthy;
    mutations++;
    throw Error('Network connection closed after saving');
  } });
  await assert.rejects(client.call('/reports', { method: 'POST', body: { title: 'Prueba' } }), /No se pudo conectar/);
  assert.equal(mutations, 1);
});

test('startup timeout prevents posting to an unavailable server and can be tried again', async () => {
  let time = 0, available = false, posts = 0;
  const client = createApiClient({ now: () => time, startupTimeoutMs: 5000, sleep: async (ms) => { time += ms; }, request: async (path) => {
    if (path === '/health') return available ? healthy : { status: 503, data: null };
    posts++; return { status: 201, data: { saved: true } };
  } });
  await assert.rejects(client.call('/reports', { method: 'POST' }), /No se pudo conectar/);
  assert.equal(posts, 0);
  assert.equal(time, 5000);
  available = true;
  assert.deepEqual(await client.call('/reports', { method: 'POST' }), { saved: true });
  assert.equal(posts, 1);
});

test('invalid server addresses and application validation errors are not retried', async () => {
  let requests = 0;
  const wrongServer = createApiClient({ request: async () => { requests++; return { status: 404 }; } });
  await assert.rejects(wrongServer.check(), /La dirección/);
  assert.equal(requests, 1);
  const app = createApiClient({ request: async (path) => path === '/health' ? healthy : { status: 401, data: { error: 'Correo o contraseña incorrectos.' } } });
  await assert.rejects(app.call('/auth/login', { method: 'POST' }), /Correo o contraseña incorrectos/);
});
