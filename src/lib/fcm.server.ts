// Server-only Firebase Admin helper. Using the classic default import from
// "firebase-admin" (marked external in vite.config.ts for Vercel) avoids the
// "Cannot read properties of undefined (reading 'SDK_VERSION')" error caused
// by rollup/vite bundling the modular subpaths.
import admin from "firebase-admin";

export type Message = Parameters<ReturnType<typeof admin.messaging>["send"]>[0];

let initialized = false;

function ensureApp() {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT not configured");
  const parsed = JSON.parse(raw) as { private_key?: string };
  if (parsed.private_key) {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }
  admin.initializeApp({
    credential: admin.credential.cert(parsed as admin.ServiceAccount),
  });
  initialized = true;
}

export async function sendFcmMessage(message: Message): Promise<string> {
  ensureApp();
  return admin.messaging().send(message);
}
