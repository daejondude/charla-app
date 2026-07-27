// Basic service worker — exists mainly to satisfy PWA installability
// criteria and give a slightly faster repeat-load experience. Deliberately
// does not do anything clever with the app's dynamic API calls: Sofía's
// replies and transcriptions must always come from the network, never a
// stale cache.
const CACHE_NAME = "charla-shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never intercept API calls (Claude/Whisper/Supabase-backed routes) —
  // those must always hit the network fresh.
  if (request.url.includes("/api/")) return;

  // Only manage simple GET requests; let everything else (POST, etc.) pass
  // through untouched.
  if (request.method !== "GET") return;

  // The HTML document itself must always prefer the network. Serving a
  // stale cached page is exactly what breaks the app after a deploy (or a
  // dev-server hot-reload) — the old page can reference JS chunks that no
  // longer exist, which fails React hydration silently. Cache is only a
  // fallback for genuinely offline use.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets (Next's content-hashed JS/CSS/image URLs) are safe to
  // serve cache-first — a changed file gets a new URL, so a stale cache
  // entry is simply never requested again once the page updates.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        return response;
      });
    })
  );
});
