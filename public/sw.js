const CACHE_NAME = "text-styler-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
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
  if (event.request.method !== "GET") {
    return;
  }

  const { request } = event;
  const isDocument = request.mode === "navigate";

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && (isDocument || APP_SHELL.includes(new URL(request.url).pathname))) {
          const cloned = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
        }

        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);

        if (cached) {
          return cached;
        }

        if (isDocument) {
          return caches.match("/");
        }

        throw new Error(`No cached response for ${request.url}`);
      }),
  );
});
