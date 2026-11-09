import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudinaryPhotoStore } from '../server/photo-storage.js';
import { firebaseCredential } from '../server/firebase-credentials.js';
const env = { FIREBASE_PROJECT_ID: 'demo-alertavecinal', CLOUDINARY_CLOUD_NAME: 'test-cloud', CLOUDINARY_API_KEY: 'fake-key', CLOUDINARY_API_SECRET: 'fake-secret' };

test('Cloudinary keeps signed upload credentials on the server and scopes assets to their project', async () => {
  const calls = [];
  const store = cloudinaryPhotoStore(env, {
    async upload(photo, options) { calls.push({ photo, options }); return { secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/asset.jpg', public_id: options.public_id }; },
    async destroy(id, options) { calls.push({ id, options }); return { result: 'ok' }; },
  });
  const asset = store.asset('AV-TEST123', 0);
  assert.equal(asset.public_id, 'alertavecinal/demo-alertavecinal/reports/AV-TEST123/0');
  assert.equal(await store.upload(asset, 'data:image/jpeg;base64,/9j/'), 'https://res.cloudinary.com/test-cloud/image/upload/asset.jpg');
  assert.equal(calls[0].options.api_secret, env.CLOUDINARY_API_SECRET);
  assert.equal(calls[0].options.overwrite, false);
  assert.equal(JSON.stringify(asset).includes(env.CLOUDINARY_API_SECRET), false);
  await store.delete(asset);
  assert.equal(calls[1].options.invalidate, true);
  await assert.rejects(store.delete({ ...asset, public_id: 'another-project/asset' }), /no pertenece/);
  await assert.rejects(store.delete({ ...asset, cloud_name: 'another-cloud' }), /no pertenece/);
  assert.equal(calls.length, 2);
});

test('Cloudinary failures redact provider errors and reject non-HTTPS photo URLs', async () => {
  const failed = cloudinaryPhotoStore(env, { async upload() { throw Error('Credentials fake-secret'); } });
  await assert.rejects(failed.upload(failed.asset('AV-TEST', 0), 'image'), (error) => error.status === 503 && !error.message.includes('fake-secret'));
  const insecure = cloudinaryPhotoStore(env, { async upload(_, options) { return { secure_url: 'http://example.test/photo', public_id: options.public_id }; } });
  await assert.rejects(insecure.upload(insecure.asset('AV-TEST', 0), 'image'), /No se pudo guardar/);
  assert.throws(() => cloudinaryPhotoStore({ ...env, CLOUDINARY_API_SECRET: '' }), /CLOUDINARY_API_SECRET/);
  assert.throws(() => failed.asset('../other', 0), /inválido/);
});

test('Firebase accepts a Render secret without disclosing malformed service account data', () => {
  const account = { project_id: env.FIREBASE_PROJECT_ID, client_email: 'test@example.test', private_key: 'fake-private-key' };
  const factories = { cert: (value) => value, applicationDefault: () => 'local-credentials' };
  assert.deepEqual(firebaseCredential({ ...env, FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(account) }, factories), account);
  assert.equal(firebaseCredential(env, factories), 'local-credentials');
  assert.throws(() => firebaseCredential({ ...env, FIREBASE_SERVICE_ACCOUNT_JSON: 'fake-private-key' }, factories), (error) => !error.message.includes('fake-private-key'));
  assert.throws(() => firebaseCredential({ ...env, FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ ...account, project_id: 'different-project' }) }, factories), /cuenta de servicio válida/);
});
