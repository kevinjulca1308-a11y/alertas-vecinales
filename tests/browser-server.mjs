// Isolated browser-test fixture. These accounts never enter the production database.
import { spawn } from 'node:child_process';
import { scryptSync, randomBytes } from 'node:crypto';
import { openDatabase } from '../server/database.js';
import { sqliteStore } from '../server/sqlite-store.js';
import { createApp } from '../server/app.js';
const db = openDatabase(':memory:');
const store = sqliteStore(db);
const salt = randomBytes(16).toString('hex');
store.createUser({ id: 'browser-admin', name: 'Administración de prueba', email: 'admin@browser.test', password_hash: `${salt}:${scryptSync('PruebaAdmin123!', salt, 64).toString('hex')}`, created_at: new Date().toISOString() });
store.grantAdmin('browser-admin');
const server = createApp({ store, secureCookies: false, serveStatic: false }).listen(3005, '127.0.0.1');
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5175', '--strictPort'], { stdio: 'inherit', env: { ...process.env, API_PORT: '3005' } });
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; vite.kill(); server.close(() => { db.close(); process.exit(code); }); }
vite.on('exit', (code) => stop(code || 0));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => stop());
