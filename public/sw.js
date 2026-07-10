// Service worker for Nawras Pizza PWA.
// - Satisfies Chrome/Android/TWA install criteria (has a fetch handler).
// - Precaches a tiny offline shell so navigation still works with no network.
// - Never caches HTML aggressively: navigations use network-first, offline.html is the fallback only.
// - Handles Web Push notifications so the TWA can receive them from the admin.

const CACHE = "nawras-offline-v3";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/nawras-icon-192.png",
  "/nawras-icon-512.png",
  "/favicon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const cache = await caches.open(CACHE);
          const offline = await cache.match(OFFLINE_URL);
          return offline || new Response("Offline", { status: 503 });
        }
      })(),
    );
    return;
  }

  const url = new URL(req.url);
  if (url.origin === self.location.origin && PRECACHE.includes(url.pathname)) {
    event.respondWith(caches.match(req).then((r) => r || fetch(req)));
  }
});

// -------- Push notifications --------

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let payload = {
        title: "Nawras Pizza",
        body: "لديك إشعار جديد",
        url: "/",
        tag: "nawras-push",
        requireInteraction: false,
      };

      try {
        if (event.data) {
          payload = { ...payload, ...event.data.json() };
        }
      } catch {
        try {
          if (event.data) payload.body = event.data.text();
        } catch {
          /* keep defaults */
        }
      }

      const safeUrl = new URL(payload.url || "/", self.location.origin).href;
      const tag = payload.tag || "nawras-push";

      // Mobile browsers require persistent notifications shown from the active
      // service worker registration. Avoid Notification() here entirely.
      await self.registration.showNotification(payload.title || "Nawras Pizza", {
        body: payload.body || "لديك إشعار جديد",
        icon: "/nawras-icon-192.png",
        badge: "/nawras-icon-192.png",
        dir: "rtl",
        lang: "ar",
        tag,
        renotify: true,
        requireInteraction: Boolean(payload.requireInteraction),
        timestamp: Date.now(),
        vibrate: [120, 60, 120],
        data: { url: safeUrl, receivedAt: Date.now() },
        actions: [{ action: "open", title: "فتح" }],
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin) {
            await client.focus();
            if ("navigate" in client) {
              await client.navigate(targetUrl).catch(() => {});
            }
            return;
          }
        } catch {
          /* ignore */
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
