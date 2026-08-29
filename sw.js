const CACHE_NAME = "uniluva-v18";

const CORE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/uniluva-icon-192.png",
  "/uniluva-icon-512.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(CORE))
      .catch(error => {
        console.error("Error precargando Uniluva:", error);
      })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  const isFirebaseRequest =
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("firebaseapp.com") ||
    url.hostname.includes("gstatic.com");

  if (isFirebaseRequest) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (
          !response ||
          response.status !== 200 ||
          response.type === "opaque"
        ) {
          return response;
        }

        const clone = response.clone();

        caches
          .open(CACHE_NAME)
          .then(cache => cache.put(request, clone))
          .catch(error => {
            console.error("Error guardando en caché:", error);
          });

        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);

        if (cached) return cached;

        if (request.mode === "navigate") {
          return caches.match("/index.html");
        }

        return new Response("Sin conexión", {
          status: 503,
          statusText: "Offline"
        });
      })
  );
});