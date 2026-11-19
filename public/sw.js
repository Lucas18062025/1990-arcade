// 1990 Arcade — Service Worker
// Estrategia:
//   · Navegación (HTML)  → network-first (un deploy llega en la próxima visita)
//   · Assets same-origin → cache-first (llevan hash en el nombre)
//   · Cross-origin       → se ignora por completo (Firestore, fuentes)
//   · Fallo de asset     → 504, NUNCA el HTML del shell (evita MIME roto)
const CACHE = "arcade-v3";
const ASSETS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png", "/shot-hub.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function cachePut(request, response) {
  // Sólo respuestas propias, completas y exitosas.
  if (!response || !response.ok || response.type !== "basic") return response;
  const copy = response.clone();
  caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
  return response;
}

// Cloudflare Pages devuelve el HTML del shell con 200 para cualquier asset
// inexistente. Servir eso como JS/CSS rompe el MIME y envenena la caché:
// si el recurso tiene extensión de asset y llega HTML, se trata como faltante.
const ASSET_EXT = /\.(?:js|mjs|css|map|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf|json)$/i;

function isAssetRequest(request) {
  try {
    return ASSET_EXT.test(new URL(request.url).pathname);
  } catch {
    return false;
  }
}

function isSpaFallback(request, response) {
  if (!isAssetRequest(request)) return false;
  const headers = response.headers;
  const type = String((headers && headers.get && headers.get("content-type")) || "").toLowerCase();
  return type.startsWith("text/html");
}

function missingAsset() {
  return new Response("", { status: 504, statusText: "Asset missing" });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => cachePut(request, response))
        .catch(async () => (await caches.match(request)) || (await caches.match("/")) || Response.error())
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request)
          .then((response) => (isSpaFallback(request, response) ? missingAsset() : cachePut(request, response)))
          .catch(() => new Response("", { status: 504, statusText: "Offline" }))
    )
  );
});
