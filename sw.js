const CACHE = "hhd-v4";
const PRECACHE = ["./", "./index.html", "./manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first with runtime caching, so after the first online load the app shell
// AND its CDN libraries (React, Tailwind, Supabase, SheetJS) are available offline.
// Live data and file storage always go to the network only.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = req.url;
  if (url.includes("supabase") || url.includes("/rest/") || url.includes("/realtime/") || url.includes("/storage/") || url.includes("/functions/")) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => { try { c.put(req, copy); } catch (err) {} });
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((m) => m || (req.mode === "navigate" ? caches.match("./index.html") : Response.error()))
      )
  );
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

// Server-sent web push.
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
