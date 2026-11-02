// Credentials are read only by Node, never by the frontend or the Android bundle.
export function firebaseCredential(env, { cert, applicationDefault }) {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()) return applicationDefault();
  try {
    const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
    if (!account.client_email || !account.private_key || account.project_id !== env.FIREBASE_PROJECT_ID)
      throw Error('Invalid service account.');
    return cert(account);
  } catch {
    throw Error('FIREBASE_SERVICE_ACCOUNT_JSON debe contener una cuenta de servicio válida del proyecto configurado.');
  }
}
