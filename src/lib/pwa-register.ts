// Service-worker registration guarded so it never runs in the Lovable editor
// preview / dev / iframe contexts (per the PWA skill).
//
// Also exposes the `beforeinstallprompt` event so an in-app "Install" button
// can trigger the native prompt on Chrome/Android without extra steps.

const SW_URL = "/sw.js";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
type Listener = (available: boolean) => void;
const listeners = new Set<Listener>();

function emit(available: boolean) {
  listeners.forEach((l) => {
    try {
      l(available);
    } catch {
      /* ignore */
    }
  });
}

function shouldSkip(): boolean {
  if (typeof window === "undefined") return true;
  if (!import.meta.env.PROD) return true;
  try {
    if (window.top !== window.self) return true; // iframe (Lovable preview)
  } catch {
    return true;
  }
  const host = window.location.hostname;
  if (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  ) {
    return true;
  }
  if (new URL(window.location.href).searchParams.get("sw") === "off") return true;
  return false;
}

async function unregisterMatching() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter((r) => r.active?.scriptURL.endsWith(SW_URL))
      .map((r) => r.unregister().catch(() => false)),
  );
}

export function registerPwa() {
  if (typeof window === "undefined") return;

  if (shouldSkip()) {
    void unregisterMatching();
    return;
  }
  if (!("serviceWorker" in navigator)) return;

  // Capture the install prompt so the app can fire it from a button.
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    emit(true);
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    emit(false);
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SW_URL).catch(() => {
      /* ignore — non-fatal, install still possible if browser retries */
    });
  });
}

export function isInstallPromptReady(): boolean {
  return deferredPrompt !== null;
}

export function subscribeInstallPrompt(listener: Listener): () => void {
  listeners.add(listener);
  listener(deferredPrompt !== null);
  return () => listeners.delete(listener);
}

export async function triggerInstallPrompt(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";
  const p = deferredPrompt;
  deferredPrompt = null;
  emit(false);
  try {
    await p.prompt();
    const choice = await p.userChoice;
    return choice.outcome;
  } catch {
    return "dismissed";
  }
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    nav.standalone === true
  );
}

export type Platform = "ios" | "android" | "desktop" | "unknown";

export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua) && !("MSStream" in window)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Windows|Macintosh|Linux/.test(ua)) return "desktop";
  return "unknown";
}
