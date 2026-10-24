const DEV = new URL(self.location.href).searchParams.has("dev");
const CACHE = DEV ? "jp-portal-pwa-dev" : "jp-portal-pwa-v1";
const BASE = new URL(self.registration.scope).pathname;
const PRECACHE = self.__PRECACHE__ || ["", "index.html", "manifest.webmanifest", "icons/app-icon.svg", "icons/icon-192.png", "icons/icon-512.png"].map((path) => `${BASE}${path}`);
const INDEX = `${BASE}index.html`;
const cachedIndex = () => caches.open(CACHE).then((cache) => cache.match(INDEX));

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => {
      const portalCaches = keys.filter((key) => key.startsWith("jp-portal-pwa-"));
      const keep = new Set([CACHE, ...portalCaches.slice(-2)]);
      return Promise.all(portalCaches.filter((key) => !keep.has(key)).map((key) => caches.delete(key)));
    }),
    self.clients.claim()
  ]));
});

self.addEventListener("message", (event) => {
  if (!DEV || event.data?.type !== "CACHE_DEV_SHELL") return;
  const urls = (event.data.urls || []).filter((value) => {
    try { const url = new URL(value); return url.origin === self.location.origin && !url.pathname.startsWith("/api/"); }
    catch { return false; }
  });
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.allSettled(urls.map((url) => cache.add(url)))));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request, { cache: "no-store" }).then((response) => {
      if (!response.ok) return cachedIndex().then((cached) => cached || response);
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(INDEX, copy));
      return response;
    }).catch(() => cachedIndex()));
    return;
  }
  if (DEV && ["script", "style"].includes(request.destination)) {
    event.respondWith(fetch(request).then((response) => {
      if (!response.ok) return caches.match(request).then((cached) => cached || response);
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
      return response;
    }).catch(() => caches.match(request)));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok && ["script", "style", "image", "font"].includes(request.destination)) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  })));
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { data = {}; }
  const title = String(data.title || "Javed Publishers News").slice(0, 120);
  const body = String(data.body || "Open your expense report.").slice(0, 300);
  const newsId = typeof data.newsId === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(data.newsId) ? data.newsId : "";
  event.waitUntil(Promise.all([self.registration.showNotification(title, {
    body,
    icon: `${BASE}icons/icon-192.png`,
    badge: `${BASE}icons/icon-192.png`,
    tag: newsId ? `jp-news-${newsId}` : "jp-news",
    data: { url: `${BASE}?news=${encodeURIComponent(newsId)}` }
  }), self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => client.postMessage({ type: "NEWS_RECEIVED", newsId }));
  })]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || BASE, self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
    const existing = clients.find((client) => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate(url); return existing.focus(); }
    return self.clients.openWindow(url);
  }));
});
