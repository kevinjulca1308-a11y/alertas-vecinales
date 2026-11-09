import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { openFirebaseStore, firebaseStore } from '../server/firebase-store.js';
import { cloudinaryPhotoStore } from '../server/photo-storage.js';

test('Firestore persists Cloudinary URLs, cleans partial uploads and retries deleted-photo cleanup', {
  skip: !process.env.FIRESTORE_EMULATOR_HOST,
}, async (t) => {
  assert.match(process.env.FIREBASE_PROJECT_ID || '', /^demo-/);
  assert.match(process.env.FIRESTORE_EMULATOR_HOST, /^(localhost|127\.0\.0\.1):\d+$/);
  // A separate emulator database prevents cleanup races with the other Firestore API suite.
  await openFirebaseStore();
  const { getApp } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const db = getFirestore(getApp('alertavecinal'), 'photo-tests');
  const uploaded = [], removed = [];
  let failSecond = false, failDelete = false;
  const photos = cloudinaryPhotoStore({ FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    CLOUDINARY_CLOUD_NAME: 'fixture-cloud', CLOUDINARY_API_KEY: 'fixture-key', CLOUDINARY_API_SECRET: 'fixture-secret' }, {
    async upload(_, options) {
      uploaded.push(options.public_id);
      if (failSecond && options.public_id.endsWith('/1')) throw Error('Upload failed');
      return { secure_url: `https://res.cloudinary.com/fixture-cloud/image/upload/${options.public_id}.jpg`, public_id: options.public_id };
    },
    async destroy(id) { if (failDelete) throw Error('Storage unavailable'); removed.push(id); return { result: 'ok' }; },
  });
  const store = firebaseStore(db, { photoStore: photos });
  const server = createApp({ store, secureCookies: false, serveStatic: false }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    for (const name of ['reports', 'users', 'user_emails', 'sessions']) await db.recursiveDelete(db.collection(name));
    await db.terminate();
  });
  const call = async (path, { method = 'GET', body, cookie } = {}) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, {
      method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  };
  const registration = await call('/auth/register', { method: 'POST', body: { name: 'Vecino de prueba', email: 'photos@fixture.test', password: 'PruebaVecinal123!' } });
  const cookie = registration.cookie;
  const photo = 'data:image/jpeg;base64,' + Buffer.from([255, 216, 255, 0, 0]).toString('base64');
  const report = { title: 'Reporte con fotografías', description: 'Una prueba de fotografías en Guadalupe.', address: 'Sector de prueba, Guadalupe',
    category: 'Alumbrado', priority: 'Media', lat: -7.243057, lng: -79.470741, photos: [photo, photo] };
  const withoutStorage = firebaseStore(db, { allowLegacyUploads: false });
  assert.equal(withoutStorage.photoUploads, false);
  assert.equal(store.photoUploads, true);
  await assert.rejects(withoutStorage.createReport({ ...report, id: 'AV-NO-PHOTOS' }), error => error.status === 503 && error.code === 'PHOTO_UPLOADS_DISABLED');
  assert.equal((await db.collection('reports').doc('AV-NO-PHOTOS').get()).exists, false);
  const saved = await call('/reports', { method: 'POST', body: report, cookie });
  assert.equal(saved.status, 201);
  const id = saved.data.report.id;
  assert.equal(saved.data.report.photos.length, 2);
  assert.equal('photo_assets' in saved.data.report, false);
  assert.equal(JSON.stringify(saved).includes('fixture-secret'), false);
  const persisted = (await db.collection('reports').doc(id).get()).data();
  assert.ok(persisted.photos.every((url) => url.startsWith('https://res.cloudinary.com/')));
  assert.equal(persisted.photo_assets.length, 2);
  await assert.rejects(store.cleanupDeletedReport(id), /sigue activo/);
  assert.equal(removed.length, 0);
  assert.equal((await call(`/reports/${id}`, { method: 'DELETE', cookie })).status, 200);
  assert.equal(removed.length, 2);
  assert.equal((await db.collection('reports').doc(id).get()).exists, false);

  failSecond = true;
  const failed = await call('/reports', { method: 'POST', body: report, cookie });
  assert.equal(failed.status, 503);
  assert.equal((await db.collection('reports').get()).size, 0);
  assert.equal(removed.length, 4); // Includes an upload whose response may have been lost.
  failSecond = false;

  // A lost commit acknowledgement must not cause deletion of successfully saved photographs.
  const ambiguousDb = new Proxy(db, { get(target, key) {
    if (key === 'batch') return () => {
      const batch = target.batch();
      return { create: (...args) => batch.create(...args), commit: async () => { await batch.commit(); throw Error('Acknowledgement lost'); } };
    };
    const value = target[key]; return typeof value === 'function' ? value.bind(target) : value;
  } });
  const ambiguousStore = firebaseStore(ambiguousDb, { photoStore: photos });
  await assert.rejects(ambiguousStore.createReport({ ...report, id: 'AV-AMBIGUOUS', owner_id: registration.data.user.id, status: 'Reportado', created_at: new Date().toISOString() }), /Acknowledgement lost/);
  assert.equal((await db.collection('reports').doc('AV-AMBIGUOUS').get()).exists, true);
  assert.equal(removed.length, 4);

  failDelete = true;
  await store.deleteReport('AV-AMBIGUOUS', registration.data.user.id);
  assert.equal((await db.collection('reports').doc('AV-AMBIGUOUS').get()).data().deleted, true);
  assert.equal(await store.getReport('AV-AMBIGUOUS'), undefined);
  failDelete = false;
  await store.cleanupDeletedReport('AV-AMBIGUOUS');
  assert.equal((await db.collection('reports').doc('AV-AMBIGUOUS').get()).exists, false);
  assert.equal(removed.length, 6);
});
