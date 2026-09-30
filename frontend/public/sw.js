/* global caches, clients, self */

const CACHE_NAME = "mahajanga-inscription-v2";
const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/icon-192.svg",
  "/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  const isStaticAsset = url.pathname.startsWith("/_next/static/");
  const isPrecached = PRECACHE_URLS.includes(url.pathname);

  if (isStaticAsset || isPrecached) {
    event.respondWith(
      caches.match(request).then((cachedResponse) =>
        cachedResponse || fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    // Always prefer the network for page loads so UI changes show up
    // immediately; keep a fresh copy for offline fallback only.
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/"))
            .then((cached) => cached || Response.error()),
        ),
    );
    return;
  }

  // RSC/data fetches and other same-origin requests: pass through untouched
  // so they always reflect current app state and are never cached stale.
});