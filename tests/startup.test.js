import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { spawn } from 'node:child_process';

test('production entry point honors hosting PORT and issues secure session cookies', { timeout: 15000 }, async (t) => {
  const reservation = net.createServer();
  await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const child = spawn(process.execPath, ['server/index.js'], {
    env: { ...process.env, NODE_ENV: 'production', PORT: String(port), API_PORT: '1', API_HOST: '', DB_PROVIDER: 'sqlite', DB_PATH: ':memory:' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => { child.kill(); });
  await new Promise((resolve, reject) => {
    let output = '';
    child.on('error', reject);
    child.once('exit', (code) => reject(new Error(`Server exited before startup: ${code}`)));
    child.stdout.on('data', (chunk) => { output += chunk; if (output.includes(`puerto ${port}`)) resolve(); });
  });
  const base = `http://127.0.0.1:${port}`;
  assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { ok: true, database: 'SQLite' });
  const registration = await fetch(`${base}/api/auth/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Producción de prueba', email: 'startup@prueba.test', password: 'PruebaVecinal123!' }),
  });
  assert.equal(registration.status, 200);
  assert.match(registration.headers.get('set-cookie'), /; Secure/);
  assert.match(registration.headers.get('set-cookie'), /; HttpOnly/);
});
