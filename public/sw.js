// Minimal service worker to satisfy Chrome/Android PWA install criteria.
// No caching — every request goes to the network unchanged.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Passthrough. Registering a fetch listener is what makes the app installable.
});
