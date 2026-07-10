// Client-side helpers for Web Push subscription.
// Public VAPID key ships in the client bundle (safe — it's public by design).
// Prefers VITE_VAPID_PUBLIC_KEY; falls back to a dev default so the app works out of the box.
// Regenerate keys for production and set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT
// on the server, plus VITE_VAPID_PUBLIC_KEY (same public key) on the client.

const DEFAULT_PUBLIC_KEY =
  "BKjyFG2KBg7eRZhY6Pc3bC-H8MQJ9vzPUVnIkDgV7EoGOUoYzXZadlS_AFDujC5S7fVtWXumvAZEGW3IQSHuCZw";

export function getVapidPublicKey(): string {
  const v = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) || DEFAULT_PUBLIC_KEY;
  return v;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export type PushStatus = "unsupported" | "denied" | "granted" | "default";

export function pushStatus(): PushStatus {
  if (!pushSupported()) return "unsupported";
  return Notification.permission as PushStatus;
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    if (reg) return reg;
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function subscribeToPush(): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") return { ok: false, reason: "denied" };

  const reg = await getRegistration();
  if (!reg) return { ok: false, reason: "no-sw" };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(getVapidPublicKey()) as unknown as BufferSource,
      });
    } catch (e) {
      return { ok: false, reason: (e as Error).message || "subscribe-failed" };
    }
  }

  const json = sub.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: "bad-subscription" };
  }

  try {
    const { savePushSubscription } = await import("./push.functions");
    await savePushSubscription({
      data: {
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent.slice(0, 300),
      },
    });
  } catch (e) {
    return { ok: false, reason: (e as Error).message || "save-failed" };
  }

  return { ok: true };
}

export async function unsubscribeFromPush(): Promise<void> {
  const reg = await getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  await sub?.unsubscribe().catch(() => {});
}
