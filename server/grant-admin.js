import { sqliteStore } from './sqlite-store.js';
const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Uso: npm run admin:grant -- correo@ejemplo.com');
  process.exit(1);
}
const provider = process.env.DB_PROVIDER || 'sqlite';
if (!['firebase', 'sqlite'].includes(provider)) throw Error('DB_PROVIDER inválido.');
const store = provider === 'firebase'
  ? await (await import('./firebase-store.js')).openFirebaseStore() : sqliteStore();
const user = await store.findUser(email);
if (!user) {
  console.error('Primero crea esta cuenta desde la aplicación. No se encontró el correo.');
  process.exit(1);
}
await store.grantAdmin(user.id);
console.log('Cuenta promovida a administrador. Vuelve a iniciar sesión en la app.');
process.exit(0);
