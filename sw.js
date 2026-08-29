const CACHE_NAME = "uniluva-v24-1";
const OFFLINE_URL = "/index.html";

const CORE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.svg",
  "/icon-512.svg"
];

const FIREBASE_HOSTS = [
  "googleapis.com",
  "firebaseio.com",
  "firebaseapp.com",
  "gstatic.com"
];

function isFirebaseRequest(url) {
  return FIREBASE_HOSTS.some(
    host =>
      url.hostname === host ||
      url.hostname.endsWith("." + host)
  );
}

self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => cache.addAll(CORE))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(
              key =>
                key.startsWith("uniluva-") &&
                key !== CACHE_NAME
            )
            .map(key => caches.delete(key))
        )
      ),

      self.clients.claim()
    ])
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (isFirebaseRequest(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();

          caches
            .open(CACHE_NAME)
            .then(cache =>
              cache.put(OFFLINE_URL, copy)
            )
            .catch(() => {});

          return response;
        })
        .catch(() =>
          caches.match(OFFLINE_URL)
        )
    );

    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (
            response &&
            response.status === 200 &&
            response.type !== "opaque"
          ) {
            const copy = response.clone();

            caches
              .open(CACHE_NAME)
              .then(cache =>
                cache.put(request, copy)
              )
              .catch(() => {});
          }

          return response;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
