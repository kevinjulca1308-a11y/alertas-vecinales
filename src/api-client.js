export const STARTUP_TIMEOUT_MS = 90000;
export const REQUEST_TIMEOUT_MS = 90000;
const connectionError = () => Object.assign(new Error('No se pudo conectar con tu comunidad. Comprueba Internet y revisa la dirección en Configurar conexión.'), { status: 503 });

// Only the read-only health check is retried. A report, comment, or registration is never resent automatically.
export function createApiClient({ request, now = Date.now, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), startupTimeoutMs = STARTUP_TIMEOUT_MS }) {
  let checkedAt = -Infinity, pending = null;
  const check = () => {
    if (now() - checkedAt < 60000) return Promise.resolve();
    if (pending) return pending;
    pending = (async () => {
      const deadline = now() + startupTimeoutMs;
      while (now() < deadline) {
        let response;
        try { response = await request('/health', { timeoutMs: Math.min(8000, deadline - now()) }); }
        catch { /* A suspended free server may not answer the first health check. */ }
        if (response?.status === 200 && response.data?.ok === true && ['Firestore', 'SQLite'].includes(response.data.database)) {
          checkedAt = now(); return;
        }
        if ([400, 401, 403, 404].includes(response?.status))
          throw Object.assign(new Error('La dirección no permite acceder a un servidor de AlertaVecinal.'), { status: response.status });
        if (now() < deadline) await sleep(Math.min(2500, deadline - now()));
      }
      throw connectionError();
    })().finally(() => { pending = null; });
    return pending;
  };
  return {
    check,
    async call(path, options = {}) {
      await check();
      let response;
      try { response = await request(path, { ...options, timeoutMs: REQUEST_TIMEOUT_MS }); }
      catch { checkedAt = -Infinity; throw connectionError(); }
      const { status, data } = response;
      if (status < 200 || status >= 300) {
        if (status >= 500) checkedAt = -Infinity;
        throw Object.assign(new Error(data?.error || 'No se pudo completar la operación. Inténtalo nuevamente.'), { status });
      }
      if (!data || typeof data !== 'object') { checkedAt = -Infinity; throw connectionError(); }
      return data;
    },
  };
}
