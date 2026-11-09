import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase } from '../server/database.js';
import { sqliteStore } from '../server/sqlite-store.js';
import { createApp } from '../server/app.js';

test('disabled photo uploads are explained safely and do not prevent publishing without photos', async t => {
  const db = openDatabase(':memory:');
  const store = sqliteStore(db);
  store.photoUploads = false;
  const server = createApp({ store, secureCookies: false, serveStatic: false }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const register = await fetch(base + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Prueba de fotografías', email: 'capabilities@fixture.test', password: 'PruebaFotos123!' }) });
  const cookie = register.headers.get('set-cookie').split(';')[0];
  assert.deepEqual(await (await fetch(base + '/capabilities')).json(), { photoUploads: false });
  const before = store.listReports().length;
  const payload = { title: 'Reporte sin almacenamiento de imágenes', category: 'Alumbrado', description: 'El poste no enciende desde ayer por la noche.', address: 'Sector de prueba, Guadalupe', lat: -7.243057, lng: -79.470741, priority: 'Media', photos: ['data:image/jpeg;base64,/9j/AAA='] };
  const post = body => fetch(base + '/reports', { method: 'POST', headers: { 'Content-Type': 'application/json', cookie }, body: JSON.stringify(body) });
  const rejected = await post(payload);
  assert.equal(rejected.status, 503);
  const error = await rejected.json();
  assert.equal(error.code, 'PHOTO_UPLOADS_DISABLED');
  assert.match(error.error, /sin fotos/);
  assert.equal(store.listReports().length, before);
  const saved = await post({ ...payload, photos: [] });
  assert.equal(saved.status, 201);
  const result = await saved.json();
  assert.equal(result.report.title, payload.title);
  assert.deepEqual(result.report.photos, []);
  assert.equal(store.listReports().length, before + 1);
  // Only the controlled operational error is exposed; provider errors remain private.
  store.createReport = () => { throw Error('fixture-provider-secret: never send to client'); };
  const failed = await post({ ...payload, photos: [] });
  assert.equal(failed.status, 500);
  assert.equal((await failed.text()).includes('fixture-provider-secret'), false);
});
