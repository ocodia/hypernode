const CACHE_NAME = "hypernode-cache-v13";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./icons/bootstrap-icons.min.css",
  "./icons/fonts/bootstrap-icons.woff2?e34853135f9e39acf64315236852cd5a",
  "./icons/fonts/bootstrap-icons.woff?e34853135f9e39acf64315236852cd5a",
  "./icons/app-icon.svg",
  "./js/main.js",
  "./js/interaction/bindings.js",
  "./js/persistence/file.js",
  "./js/persistence/storage.js",
  "./js/render/renderer.js",
  "./js/state/store.js",
  "./js/utils/constants.js",
  "./js/utils/graph.js",
  "./js/utils/id.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("./index.html")),
        ),
    );
    return;
  }

  if (isAppShellRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response || response.status !== 200) return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    }),
  );
});

function isAppShellRequest(request) {
  return (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "document" ||
    request.destination === "worker" ||
    request.destination === "manifest"
  );
}
