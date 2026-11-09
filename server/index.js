import { createApp } from './app.js';
import { sqliteStore } from './sqlite-store.js';
const provider = process.env.DB_PROVIDER || 'sqlite';
if (process.env.RENDER && provider !== 'firebase') throw Error('En Render configura DB_PROVIDER=firebase para conservar los datos fuera del disco temporal.');
if (!['sqlite', 'firebase'].includes(provider)) throw Error('DB_PROVIDER debe ser sqlite o firebase.');
const store = provider === 'firebase'
  ? await (await import('./firebase-store.js')).openFirebaseStore()
  : sqliteStore();
// Fail at startup if Firestore credentials or the database are unavailable.
if (provider === 'firebase') await store.listReports();
const port = Number(process.env.PORT || process.env.API_PORT || 3001);
const server = createApp({ store }).listen(port, process.env.API_HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'),
  () => console.log(`AlertaVecinal API · ${store.name} · puerto ${port}`));
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(() => process.exit(0)));
