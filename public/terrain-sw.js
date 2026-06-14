const CACHE_NAME = "demat-terrain-shell-v1";
const APP_SHELL = [
  "/terrain/login",
  "/terrain.webmanifest",
  "/terrain-icon-192.png",
  "/terrain-icon-512.png",
  "/dashboard-favicon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate" && url.pathname.startsWith("/terrain")) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return cache.match("/terrain/login");
      }),
    );
    return;
  }

  if (
    request.destination === "image" ||
    request.destination === "style" ||
    request.destination === "script" ||
    url.pathname === "/terrain.webmanifest"
  ) {
    event.respondWith(
      caches.match(request).then(
        (cachedResponse) =>
          cachedResponse ||
          fetch(request).then((networkResponse) => {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
            return networkResponse;
          }),
      ),
    );
  }
});
