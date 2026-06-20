const STATIC_CACHE_NAME = "demat-terrain-static-v3";
const PAGE_CACHE_NAME = "demat-terrain-pages-v3";
const FILE_CACHE_NAME = "demat-terrain-files-v3";
const APP_SHELL = [
  "/terrain/login",
  "/terrain.webmanifest",
  "/terrain-icon-192.png",
  "/terrain-icon-512.png",
  "/dashboard-favicon.png",
];

const ALL_CACHE_NAMES = [STATIC_CACHE_NAME, PAGE_CACHE_NAME, FILE_CACHE_NAME];

async function cacheStaticShell() {
  const cache = await caches.open(STATIC_CACHE_NAME);
  await cache.addAll(APP_SHELL);
}

async function prefetchTerrainUrls(urls = []) {
  const cache = await caches.open(PAGE_CACHE_NAME);

  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url, {
          cache: "no-store",
          credentials: "include",
        });

        if (response.ok) {
          await cache.put(url, response.clone());
        }
      } catch (error) {
        console.error("Terrain prefetch failed", url, error);
      }
    }),
  );
}

async function clearDynamicCaches() {
  await Promise.all([caches.delete(PAGE_CACHE_NAME), caches.delete(FILE_CACHE_NAME)]);
}

async function fallbackForPath(pathname) {
  const pageCache = await caches.open(PAGE_CACHE_NAME);
  const staticCache = await caches.open(STATIC_CACHE_NAME);
  const candidates = [];

  if (pathname.startsWith("/terrain/messages")) {
    candidates.push("/terrain/messages");
  } else if (pathname.startsWith("/terrain/journee")) {
    candidates.push("/terrain/journee");
  } else if (pathname.startsWith("/terrain/infos")) {
    candidates.push("/terrain/infos");
  } else if (pathname.startsWith("/terrain")) {
    candidates.push("/terrain");
  }

  candidates.push("/terrain/login");

  for (const candidate of candidates) {
    const cachedResponse =
      (await pageCache.match(candidate)) || (await staticCache.match(candidate));

    if (cachedResponse) {
      return cachedResponse;
    }
  }

  return Response.error();
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    cacheStaticShell().then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !ALL_CACHE_NAMES.includes(key)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (!event.data || typeof event.data !== "object") {
    return;
  }

  if (event.data.type === "PREFETCH_TERRAIN_URLS") {
    event.waitUntil(prefetchTerrainUrls(Array.isArray(event.data.urls) ? event.data.urls : []));
  }

  if (event.data.type === "CLEAR_TERRAIN_CACHES") {
    event.waitUntil(clearDynamicCaches());
  }
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
      fetch(request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(PAGE_CACHE_NAME);
            await cache.put(request, response.clone());
          }

          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          return cachedResponse || fallbackForPath(url.pathname);
        }),
    );
    return;
  }

  if (url.pathname.startsWith("/terrain/messages/attachments/") || url.pathname === "/terrain/bt-pdf") {
    event.respondWith(
      caches.match(request).then(async (cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
          const cache = await caches.open(FILE_CACHE_NAME);
          await cache.put(request, networkResponse.clone());
        }

        return networkResponse;
      }),
    );
    return;
  }

  if (
    request.destination === "image" ||
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font" ||
    url.pathname === "/terrain.webmanifest"
  ) {
    event.respondWith(
      caches.match(request).then(
        (cachedResponse) =>
          cachedResponse ||
          fetch(request).then((networkResponse) => {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, responseClone));
            return networkResponse;
          }),
      ),
    );
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  let payload = null;

  try {
    payload = event.data.json();
  } catch {
    payload = {
      body: event.data.text(),
      title: "Notification terrain",
      url: "/terrain",
    };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Notification terrain", {
      badge: payload.badge ?? "/terrain-icon-192.png",
      body: payload.body ?? "",
      data: {
        ...(payload.data ?? {}),
        url: payload.url ?? "/terrain",
      },
      icon: payload.icon ?? "/terrain-icon-192.png",
      requireInteraction: Boolean(payload.requireInteraction),
      tag: payload.tag ?? undefined,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url ?? "/terrain";

  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
      for (const client of clients) {
        const clientUrl = new URL(client.url);

        if (clientUrl.pathname.startsWith("/terrain")) {
          return client.focus().then(() => client.navigate(targetUrl));
        }
      }

      return self.clients.openWindow(targetUrl);
    }),
  );
});
