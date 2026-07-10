// Client-side helpers for Web Push subscription.
// The VAPID public key is fetched from our own backend so production only needs
// the server-side VAPID_PUBLIC_KEY value; no separate client env is required.

const VAPID_KEY_STORAGE = "nawras_vapid_public_key_v1";

async function getVapidPublicKey(): Promise<string> {
  const bundled = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (bundled) return bundled;

  const res = await fetch("/api/public/push-vapid-key", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("vapid-key-unavailable");
  const data = (await res.json()) as { publicKey?: string };
  if (!data.publicKey) throw new Error("missing-vapid-key");
  return data.publicKey;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string | null {
  if (!buffer) return null;
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function getStoredVapidKey(): string | null {
  try {
    return localStorage.getItem(VAPID_KEY_STORAGE);
  } catch {
    return null;
  }
}

function setStoredVapidKey(value: string) {
  try {
    localStorage.setItem(VAPID_KEY_STORAGE, value);
  } catch {
    /* ignore */
  }
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
    const next = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready.catch(() => next);
    return next;
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

  let publicKey: string;
  try {
    publicKey = await getVapidPublicKey();
  } catch (e) {
    return { ok: false, reason: (e as Error).message || "vapid-key-unavailable" };
  }

  const applicationServerKey = urlBase64ToUint8Array(publicKey) as unknown as BufferSource;

  let sub = await reg.pushManager.getSubscription();
  const existingKey = arrayBufferToBase64Url(sub?.options.applicationServerKey ?? null);
  const storedKey = getStoredVapidKey();
  if (sub && ((existingKey && existingKey !== publicKey) || (storedKey && storedKey !== publicKey))) {
    await sub.unsubscribe().catch(() => false);
    sub = null;
  }

  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
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
    const res = await fetch("/api/public/push-subscription", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
        user_agent: navigator.userAgent.slice(0, 300),
      }),
    });
    if (!res.ok) {
      const errorBody = (await res.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, reason: errorBody?.error || "save-failed" };
    }
    setStoredVapidKey(publicKey);
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
