// Server-only Firebase Admin helper. Uses node:module's createRequire to load
// firebase-admin subpaths dynamically at runtime. This completely prevents
// Vite, Rollup, and Nitro from statically analyzing or bundling firebase-admin's
// internals, avoiding the "Cannot read properties of undefined (reading 'SDK_VERSION')" error.
import { createRequire } from "node:module";
import type { Message } from "firebase-admin/messaging";
import type { ServiceAccount } from "firebase-admin/app";

const require = createRequire(import.meta.url);
const { getApps, initializeApp, cert } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

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
