// Server-only Firebase Admin helper. The modular subpaths are externalized
// in vite.config.ts for the Vercel build, which prevents rollup from
// bundling firebase-admin's internals and avoids the
// "Cannot read properties of undefined (reading 'SDK_VERSION')" runtime error.
// firebase-admin v14 removed the classic default-export namespace API, so we
// must use the modular subpath imports.
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
