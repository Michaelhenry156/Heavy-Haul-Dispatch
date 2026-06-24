const CACHE = "hhd-v1";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(["./", "./index.html", "./manifest.json"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = e.request.url;
  // Never cache Supabase / API calls — always go to the network for live data.
  if (url.includes("supabase") || url.includes("/rest/") || url.includes("/realtime/")) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
