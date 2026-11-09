import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { openDatabase } from '../server/database.js';
import { sqliteStore } from '../server/sqlite-store.js';

test('administration enforces roles, moderates reports and comments, and revokes suspended access', async (t) => {
  const db = openDatabase(':memory:');
  const store = sqliteStore(db);
  const server = createApp({ store, secureCookies: false, serveStatic: false }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => { await new Promise((resolve) => server.close(resolve)); db.close(); });
  const call = async (path, { method = 'GET', body, cookie } = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  };
  const register = (email) => call('/auth/register', { method: 'POST', body: { name: 'Vecino de prueba', email, password: 'PruebaSeguro123!', role: 'admin', status: 'active' } });
  const a = await register('admin@prueba.test');
  const b = await register('vecino@prueba.test');
  assert.equal(a.data.user.role, 'user', 'Registration must ignore client-supplied roles');
  assert.equal((await call('/admin/users')).status, 401);
  assert.equal((await call('/admin/users', { cookie: b.cookie })).status, 403);
  store.grantAdmin(a.data.user.id);
  assert.equal((await call('/me', { cookie: a.cookie })).data.user.role, 'admin');
  const users = await call('/admin/users', { cookie: a.cookie });
  assert.equal(users.data.users.length, 2);
  assert.ok(users.data.users.every((u) => !('password_hash' in u)));
  const created = await call('/reports', { method: 'POST', cookie: b.cookie, body: {
    title: 'Luminaria averiada cerca del parque', description: 'La luminaria no funciona y necesita mantenimiento.',
    category: 'Alumbrado', priority: 'Alta', address: 'Calle Primavera 123', lat: -12.12, lng: -77.03, photos: [],
  } });
  const id = created.data.report.id;
  const comment = await call(`/reports/${id}/comments`, { method: 'POST', body: { body: 'Comentario para moderar.' }, cookie: b.cookie });
  const commentId = comment.data.report.comments[0].id;
  assert.equal((await call(`/reports/${id}/comments/${commentId}`, { method: 'DELETE', cookie: b.cookie })).status, 403);
  const moderated = await call(`/reports/${id}/comments/${commentId}`, { method: 'DELETE', cookie: a.cookie });
  assert.equal(moderated.status, 200);
  assert.equal(moderated.data.report.comments.length, 0);
  const updated = await call(`/reports/${id}/status`, { method: 'PATCH', cookie: a.cookie, body: { status: 'En proceso', note: 'Se asignó la revisión del caso.' } });
  assert.equal(updated.status, 200);
  assert.match(updated.data.report.history.at(-1).note, /^Administración:/);
  assert.equal((await call(`/admin/users/${b.data.user.id}/status`, { method: 'PATCH', body: { status: 'suspended' }, cookie: b.cookie })).status, 403);
  assert.equal((await call(`/admin/users/${a.data.user.id}/status`, { method: 'PATCH', body: { status: 'suspended' }, cookie: a.cookie })).status, 403);
  assert.equal((await call(`/admin/users/${b.data.user.id}/status`, { method: 'PATCH', body: { status: 'suspended' }, cookie: a.cookie })).status, 200);
  assert.equal((await call('/me', { cookie: b.cookie })).data.user, null);
  assert.equal((await call(`/reports/${id}/support`, { method: 'PUT', body: { active: true }, cookie: b.cookie })).status, 401);
  assert.equal((await call('/auth/login', { method: 'POST', body: { email: 'vecino@prueba.test', password: 'PruebaSeguro123!' } })).status, 403);
  assert.equal((await call(`/admin/users/${b.data.user.id}/status`, { method: 'PATCH', body: { status: 'active' }, cookie: a.cookie })).status, 200);
  assert.equal((await call('/auth/login', { method: 'POST', body: { email: 'vecino@prueba.test', password: 'PruebaSeguro123!' } })).status, 200);
  assert.equal((await call(`/reports/${id}`, { method: 'DELETE', cookie: a.cookie })).status, 200);
  assert.equal((await call(`/reports/${id}`)).status, 404);
});
