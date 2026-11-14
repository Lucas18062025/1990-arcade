const CACHE = "arcade-v2";
const ASSETS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png", "/shot-hub.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;

  // No cachear peticiones cross-origin (ej. Firestore API, Google Fonts, etc.)
  // Evita congelar el leaderboard y que queden datos obsoletos
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first para navegaciones (HTML): los redeploys llegan en la próxima
  // visita sin depender de bump manual de versión. Fallback a cache offline.
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((hit) => hit || caches.match("/")))
    );
    return;
  }

  // Cache-first para el resto (assets hasheados, manifest, iconos, screenshots)
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
            return res;
          })
          .catch(() => caches.match("/"))
    )
  );
});
