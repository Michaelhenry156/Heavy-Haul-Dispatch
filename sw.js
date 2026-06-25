const CACHE = "hhd-v3";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(["./", "./index.html", "./manifest.json"]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = e.request.url;
  // Never cache Supabase / API calls — always go to the network for live data.
  if (url.includes("supabase") || url.includes("/rest/") || url.includes("/realtime/")) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

// Tap a notification -> focus the app if it's already open, otherwise open it.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          if ("navigate" in c && target) { try { c.navigate(target); } catch (err) {} }
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});

// Server-sent web push. Only used if/when push is configured server-side;
// harmless to have in place now.
self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; }
  catch (err) { data = { title: "Heavy Haul Dispatch", body: e.data ? e.data.text() : "" }; }
  const title = data.title || "Heavy Haul Dispatch";
  e.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      tag: data.tag || ("hhd-" + Date.now()),
      renotify: false,
      data: { url: data.url || "./" }
    })
  );
});
