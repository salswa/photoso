/**
 * sw.js — Service Worker
 * Caches the app shell so it works offline after first load.
 */

const CACHE_NAME = "framesort-v2";
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./js/fileSystem.js",
  "./js/photoLoader.js",
  "./js/triage.js",
  "./js/keyboard.js",
  "./js/ui.js",
  "./manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests for our own assets
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Network succeeded — update cache in background, return fresh response
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(event.request, response.clone()));
        return response;
      })
      .catch(() => {
        // Network failed (offline) — fall back to cache
        return caches.match(event.request);
      }),
  );
});
