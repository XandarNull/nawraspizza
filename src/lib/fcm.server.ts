// Server-only Firebase Admin helper. Keeping firebase-admin isolated in a
// .server.ts module avoids bundler edge cases (e.g. "Cannot read properties
// of undefined (reading 'SDK_VERSION')") that appear when the modular
// subpath imports get processed by the client-adjacent bundle graph.
import * as admin from "firebase-admin";

let initialized = false;

function ensureApp() {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT not configured");
  let parsed: { private_key?: string; project_id?: string; client_email?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = JSON.parse(raw.replace(/\n/g, "\\n"));
  }
  if (parsed.private_key) {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }
  admin.initializeApp({
    credential: admin.credential.cert(parsed as admin.ServiceAccount),
  });
  initialized = true;
}

export async function sendFcmMessage(message: admin.messaging.Message): Promise<string> {
  ensureApp();
  return admin.messaging().send(message);
}
