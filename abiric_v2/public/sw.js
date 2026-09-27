const CACHE_NAME = "abiric-cache-v1";
const APP_SHELL = ["/dashboard", "/login", "/offline.html", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Network-first for API calls (fresh contract/pipeline data), falling back to cache.
  if (request.url.includes("/api/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for the app shell, falling back to the offline page.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).catch(() => caches.match("/offline.html"))
    )
  );
});

// Push notifications for contract alerts.
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Abiric Alert", {
      body: data.body || "A new contract matches your criteria.",
      icon: "/icons/icon-192.png",
    })
  );
});
