import { randomUUID, createHash } from 'node:crypto';
import { cloudinaryPhotoStore, firebasePhotoStore } from './photo-storage.js';
import { firebaseCredential } from './firebase-credentials.js';

const failure = (status, message) => Object.assign(new Error(message), { status });
const existing = (snapshot) => {
  if (!snapshot.exists || snapshot.data().deleted) throw failure(404, 'El reporte ya no está disponible.');
  return snapshot.data();
};
const owner = async (tx, users, row, user) => {
  const account = (await tx.get(users.doc(user))).data();
  if (!account || account.status === 'suspended') throw failure(403, 'Tu cuenta no tiene acceso.');
  if (account.role !== 'admin' && (row.owner_id !== user || row.demo))
    throw failure(403, 'Solo puedes gestionar tus propios reportes.');
};

// The SDK and credentials stay on the server, never in the Android bundle.
export async function openFirebaseStore() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw Error('Configura FIREBASE_PROJECT_ID. Consulta FIREBASE.md.');
  const [{ initializeApp, getApps, applicationDefault, cert }, { getFirestore }, { getStorage, getDownloadURL }] = await Promise.all([
    import('firebase-admin/app'), import('firebase-admin/firestore'), import('firebase-admin/storage'),
  ]);
  const app = getApps().find((a) => a.name === 'alertavecinal') || initializeApp({
    projectId,
    ...(process.env.FIRESTORE_EMULATOR_HOST ? {} : { credential: firebaseCredential(process.env, { cert, applicationDefault }) }),
    ...(process.env.FIREBASE_STORAGE_BUCKET ? { storageBucket: process.env.FIREBASE_STORAGE_BUCKET } : {}),
  }, 'alertavecinal');
  const firestore = getFirestore(app);
  const bucket = process.env.FIREBASE_STORAGE_BUCKET ? getStorage(app).bucket() : null;
  const provider = process.env.PHOTO_PROVIDER || (process.env.CLOUDINARY_CLOUD_NAME ? 'cloudinary' : bucket ? 'firebase' : 'none');
  if (!['cloudinary', 'firebase', 'none'].includes(provider)) throw Error('PHOTO_PROVIDER debe ser cloudinary, firebase o none.');
  if (provider === 'firebase' && !bucket) throw Error('Configura FIREBASE_STORAGE_BUCKET.');
  const photoStore = provider === 'cloudinary' ? cloudinaryPhotoStore() : provider === 'firebase' ? firebasePhotoStore(bucket, getDownloadURL) : null;
  return firebaseStore(firestore, { bucket, getDownloadURL, photoStore, allowLegacyUploads: false });
}

export function firebaseStore(db, { bucket = null, getDownloadURL, photoStore = null, allowLegacyUploads = true } = {}) {
  const reports = db.collection('reports');
  const users = db.collection('users');
  const sessions = db.collection('sessions');
  const emailRef = (email) => db.collection('user_emails').doc(createHash('sha256').update(email).digest('hex'));
  const legacyStore = bucket ? firebasePhotoStore(bucket, getDownloadURL) : null;
  const uploads = photoStore || (allowLegacyUploads ? legacyStore : null);
  const stores = new Map([legacyStore, photoStore].filter(Boolean).map((s) => [s.provider, s]));
  const cleanupPhotos = async (row) => {
    if (row.photo_assets?.length) {
      for (const asset of row.photo_assets) {
        const storage = stores.get(asset.provider);
        if (!storage) throw Error(`Configura el almacenamiento ${asset.provider} para completar la eliminación.`);
        await storage.delete(asset);
      }
    } else if (row.photos?.length) {
      if (!legacyStore) throw Error('Configura el bucket original para eliminar las fotografías antiguas.');
      await legacyStore.deleteLegacy(row.id);
    }
  };
  const mutate = (id, action) => db.runTransaction(async (tx) => {
    const ref = reports.doc(id);
    const row = existing(await tx.get(ref));
    return action(tx, ref, row);
  });
  const cleanupDeletedReport = async (id) => {
    const snapshot = await reports.doc(id).get();
    if (!snapshot.exists) return;
    const row = snapshot.data();
    if (!row.deleted) throw failure(409, 'El reporte sigue activo y no puede limpiarse.');
    await cleanupPhotos({ ...row, id });
    await db.recursiveDelete(reports.doc(id));
  };
  return {
    name: 'Firestore',
    cleanupDeletedReport,
    async findUser(email) {
      const index = await emailRef(email).get();
      return index.exists ? (await users.doc(index.data().user_id).get()).data() : undefined;
    },
    async getUser(id) { return (await users.doc(id).get()).data(); },
    async listUsers() {
      const [accounts, allReports] = await Promise.all([users.orderBy('created_at', 'desc').get(), reports.get()]);
      const counts = new Map();
      for (const report of allReports.docs) {
        const row = report.data();
        if (!row.deleted) counts.set(row.owner_id, (counts.get(row.owner_id) || 0) + 1);
      }
      return accounts.docs.map((d) => {
        const u = d.data();
        return { id: d.id, name: u.name, email: u.email, created_at: u.created_at,
          role: u.role || 'user', status: u.status || 'active', report_count: counts.get(d.id) || 0 };
      });
    },
    async setUserStatus(id, status) { await users.doc(id).update({ status }); },
    async grantAdmin(id) { await users.doc(id).update({ role: 'admin', status: 'active' }); },
    async deleteComment(id, comment) {
      await mutate(id, (tx, ref) => tx.delete(ref.collection('comments').doc(comment)));
    },
    async createUser(user) {
      await db.runTransaction(async (tx) => {
        const ref = emailRef(user.email);
        if ((await tx.get(ref)).exists) throw failure(409, 'Ese correo ya tiene una cuenta. Inicia sesión.');
        tx.create(users.doc(user.id), user);
        tx.create(ref, { user_id: user.id });
      });
    },
    async getSession(token, now) {
      const snapshot = await sessions.doc(token).get();
      if (!snapshot.exists || snapshot.data().expires_at.toMillis() <= now) return undefined;
      return (await users.doc(snapshot.data().user_id).get()).data();
    },
    async createSession(token, user, expires) {
      await sessions.doc(token).set({ user_id: user, expires_at: new Date(expires) });
    },
    async deleteSession(token) { await sessions.doc(token).delete(); },
    async getReport(id) {
      const snapshot = await reports.doc(id).get();
      return snapshot.exists && !snapshot.data().deleted ? { ...snapshot.data(), id: snapshot.id } : undefined;
    },
    async listReports() {
      const snapshot = await reports.orderBy('created_at', 'desc').get();
      return snapshot.docs.filter((d) => !d.data().deleted).map((d) => ({ ...d.data(), id: d.id }));
    },
    async present(row, user) {
      const ref = reports.doc(row.id);
      const [author, comments, history, supported, saved] = await Promise.all([
        users.doc(row.owner_id).get(), ref.collection('comments').orderBy('created_at').get(),
        ref.collection('history').orderBy('created_at').get(),
        user ? ref.collection('votes').doc(user).get() : null,
        user ? ref.collection('bookmarks').doc(user).get() : null,
      ]);
      return {
        id: row.id, title: row.title, category: row.category, description: row.description,
        address: row.address, lat: row.lat, lng: row.lng, status: row.status, priority: row.priority,
        photos: row.photos, date: row.created_at, demo: false, author: author.data()?.name || 'Vecino',
        votes: row.vote_count || 0, own: !!user && row.owner_id === user,
        supported: supported?.exists || false, saved: saved?.exists || false,
        comments: comments.docs.map((d) => {
          const c = d.data();
          return { id: d.id, body: c.body, date: c.created_at, author: c.author, own: c.user_id === user };
        }),
        history: history.docs.map((d) => {
          const h = d.data(); return { status: h.status, note: h.note, date: h.created_at };
        }),
      };
    },
    async createReport(row) {
      if (row.photos.length && !uploads) throw failure(503, 'Configura Cloudinary en el servidor para adjuntar fotos.');
      const photos = [], assets = [];
      let committing = false;
      try {
        for (const [index, photo] of row.photos.entries()) {
          const asset = uploads.asset(row.id, index);
          assets.push(asset);
          photos.push(await uploads.upload(asset, photo));
        }
        const batch = db.batch();
        const ref = reports.doc(row.id);
        batch.create(ref, { ...row, photos, photo_assets: assets, vote_count: 0, deleted: false });
        batch.create(ref.collection('history').doc(randomUUID()), {
          status: row.status, note: 'Reporte creado por el vecino', created_at: row.created_at,
        });
        committing = true;
        await batch.commit();
      } catch (error) {
        // Upload failures cannot have created a report. Remove even timed-out uploads by their deterministic IDs.
        if (!committing && uploads) {
          const cleanup = await Promise.allSettled(assets.map((asset) => uploads.delete(asset)));
          if (cleanup.some((result) => result.status === 'rejected')) console.error('Revisar fotografías de un envío incompleto:', row.id);
        }
        // A commit failure may be ambiguous. Keep its photos instead of breaking a possibly saved report.
        throw error;
      }
    },
    async updateStatus(id, user, status, note, date) {
      await mutate(id, async (tx, ref, row) => {
        await owner(tx, users, row, user);
        if (row.status === status) throw failure(409, 'Selecciona un estado diferente al actual.');
        tx.update(ref, { status });
        tx.create(ref.collection('history').doc(randomUUID()), { status, note, created_at: date });
      });
    },
    async deleteReport(id, user) {
      // A tombstone blocks concurrent comments/votes while child collections are removed.
      await mutate(id, async (tx, ref, row) => { await owner(tx, users, row, user); tx.update(ref, { deleted: true }); });
      try {
        await cleanupDeletedReport(id);
      } catch (error) {
        console.error('Limpieza pendiente de reporte eliminado:', id, error.message);
        // The tombstone remains hidden and can be retried by an administrator.
      }
    },
    async toggle(id, user, table, active) {
      if (!['votes', 'bookmarks'].includes(table)) throw Error('Invalid relation');
      await mutate(id, async (tx, ref, row) => {
        const relation = ref.collection(table).doc(user);
        const snapshot = await tx.get(relation);
        if (snapshot.exists === active) return;
        if (active) tx.create(relation, { user_id: user }); else tx.delete(relation);
        if (table === 'votes') tx.update(ref, { vote_count: (row.vote_count || 0) + (active ? 1 : -1) });
      });
    },
    async addComment(id, comment) {
      await mutate(id, async (tx, ref) => {
        const user = await tx.get(users.doc(comment.user_id));
        if (!user.exists) throw failure(401, 'Inicia sesión para participar.');
        tx.create(ref.collection('comments').doc(comment.id), { ...comment, author: user.data().name });
      });
    },
  };
}
