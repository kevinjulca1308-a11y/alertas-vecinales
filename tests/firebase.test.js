import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../server/app.js';
import { openFirebaseStore } from '../server/firebase-store.js';

test('Firestore API: sessions, unique emails, ownership, support, comments and deletion', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async (t) => {
  // Refuse to run cleanup or writes against a real project.
  const project = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'demo-alertavecinal';
  assert.match(project, /^demo-/);
  assert.match(process.env.FIRESTORE_EMULATOR_HOST, /^(localhost|127\.0\.0\.1):\d+$/);
  process.env.FIREBASE_PROJECT_ID = project;
  const store = await openFirebaseStore();
  const server = createApp({ store, secureCookies: false, serveStatic: false }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { getFirestore } = await import('firebase-admin/firestore');
  const { getApp } = await import('firebase-admin/app');
  const db = getFirestore(getApp('alertavecinal'));
  const ids = [];
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    for (const id of ids) await db.recursiveDelete(db.collection('reports').doc(id));
    // This is an isolated emulator database, never a real project.
    for (const collection of ['sessions', 'user_emails', 'users'])
      await db.recursiveDelete(db.collection(collection));
  });
  const call = async (path, { method = 'GET', body, cookie } = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  };
  const register = (email) => call('/auth/register', {
    method: 'POST', body: { name: 'Vecino Firebase', email, password: 'PruebaSeguro123!' },
  });
  assert.equal((await call('/health')).data.database, 'Firestore');
  const email = `${randomUUID()}@vecino.test`;
  const registrations = await Promise.all([register(email), register(email)]);
  assert.deepEqual(registrations.map((r) => r.status).sort(), [200, 409]);
  const a = registrations.find((r) => r.status === 200);
  const b = await register(`${randomUUID()}@vecino.test`);
  assert.equal(b.status, 200);
  assert.equal((await call('/me', { cookie: a.cookie })).data.user.email, email);
  const report = {
    title: 'Luminaria apagada en el parque', category: 'Alumbrado', priority: 'Alta',
    description: 'No enciende la luminaria del parque desde ayer.', address: 'Calle Primavera 123',
    lat: -12.12, lng: -77.03, photos: [],
  };
  assert.equal((await call('/reports', { method: 'POST', body: report })).status, 401);
  const created = await call('/reports', { method: 'POST', body: report, cookie: a.cookie });
  assert.equal(created.status, 201);
  const id = created.data.report.id;
  ids.push(id);
  assert.equal((await call(`/reports/${id}`, { cookie: b.cookie })).data.report.own, false);
  assert.equal((await call(`/reports/${id}`, { method: 'DELETE', cookie: b.cookie })).status, 403);
  const votes = await Promise.all(Array.from({ length: 4 }, () => call(`/reports/${id}/support`, {
    method: 'PUT', body: { active: true }, cookie: b.cookie,
  })));
  assert.ok(votes.every((r) => r.status === 200));
  assert.equal((await call(`/reports/${id}`)).data.report.votes, 1);
  await call(`/reports/${id}/save`, { method: 'PUT', body: { active: true }, cookie: b.cookie });
  assert.equal((await call(`/reports/${id}`, { cookie: b.cookie })).data.report.saved, true);
  assert.equal((await call(`/reports/${id}`, { cookie: a.cookie })).data.report.saved, false);
  const commented = await call(`/reports/${id}/comments`, { method: 'POST', body: { body: 'También observé el problema.' }, cookie: b.cookie });
  assert.equal(commented.status, 201);
  assert.equal(commented.data.report.comments[0].own, true);
  assert.equal((await call(`/reports/${id}/status`, {
    method: 'PATCH', body: { status: 'Resuelto', note: 'Se reparó la luminaria.' }, cookie: b.cookie,
  })).status, 403);
  const updated = await call(`/reports/${id}/status`, {
    method: 'PATCH', body: { status: 'Resuelto', note: 'Se reparó la luminaria.' }, cookie: a.cookie,
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.report.history.length, 2);
  // A fresh store reads the same persisted cloud data.
  assert.equal((await (await openFirebaseStore()).getReport(id)).status, 'Resuelto');
  await store.grantAdmin(b.data.user.id);
  assert.equal((await call('/me', { cookie: b.cookie })).data.user.role, 'admin');
  assert.equal((await call('/admin/users', { cookie: a.cookie })).status, 403);
  const listed = await call('/admin/users', { cookie: b.cookie });
  assert.ok(listed.data.users.every((u) => !('password_hash' in u)));
  const changed = await call(`/reports/${id}/status`, { method: 'PATCH', body: { status: 'En proceso', note: 'Revisión administrativa del caso.' }, cookie: b.cookie });
  assert.equal(changed.status, 200);
  assert.match(changed.data.report.history.at(-1).note, /^Administración:/);
  const commentId = commented.data.report.comments[0].id;
  assert.equal((await call(`/reports/${id}/comments/${commentId}`, { method: 'DELETE', cookie: b.cookie })).status, 200);
  assert.equal((await call(`/admin/users/${a.data.user.id}/status`, { method: 'PATCH', body: { status: 'suspended' }, cookie: b.cookie })).status, 200);
  assert.equal((await call('/me', { cookie: a.cookie })).data.user, null);
  assert.equal((await call(`/reports/${id}/support`, { method: 'PUT', body: { active: true }, cookie: a.cookie })).status, 401);
  await call(`/admin/users/${a.data.user.id}/status`, { method: 'PATCH', body: { status: 'active' }, cookie: b.cookie });
  assert.equal((await call(`/reports/${id}`, { method: 'DELETE', cookie: b.cookie })).status, 200);
  assert.equal((await call(`/reports/${id}`)).status, 404);
  assert.equal((await db.collection('reports').doc(id).collection('comments').get()).size, 0);
  await call('/auth/logout', { method: 'POST', cookie: b.cookie });
  assert.equal((await call('/me', { cookie: b.cookie })).data.user, null);
  const badPhotos = await call('/reports', { method: 'POST', body: { ...report, photos: ['invalid'] }, cookie: a.cookie });
  assert.equal(badPhotos.status, 400);
});
