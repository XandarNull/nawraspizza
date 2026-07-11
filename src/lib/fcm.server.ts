// Server-only Firebase Admin helper. Isolating firebase-admin here (and
// externalizing it in nitro) avoids the "Cannot read properties of
// undefined (reading 'SDK_VERSION')" error that surfaces when the SDK is
// bundled by rollup/vite for the serverless build.
import { getApps, initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getMessaging, type Message } from "firebase-admin/messaging";

let initialized = false;

function ensureApp() {
  if (initialized || getApps().length > 0) {
    initialized = true;
    return;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT not configured");
  const parsed = JSON.parse(raw) as { private_key?: string };
  if (parsed.private_key) {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }
  initializeApp({ credential: cert(parsed as ServiceAccount) });
  initialized = true;
}

export async function sendFcmMessage(message: Message): Promise<string> {
  ensureApp();
  return getMessaging().send(message);
}

export type { Message };
