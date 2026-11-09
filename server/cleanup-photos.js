import { openFirebaseStore } from './firebase-store.js';
const id = process.argv[2];
if (!/^AV-[A-Za-z0-9-]+$/.test(id || '')) throw Error('Indica un reporte eliminado: npm run photos:cleanup -- AV-CODIGO');
const store = await openFirebaseStore();
await store.cleanupDeletedReport(id);
console.log(`Limpieza completada: ${id}`);
