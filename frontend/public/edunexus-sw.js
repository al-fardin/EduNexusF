/* No academic data, authentication tokens, or exam responses are cached here. */
const storeName = "edunexus-push-binding";
const shellCache="edunexus-offline-shell-v3";
const assetCache="edunexus-offline-assets-v3";
async function prepareOfflineShell(){const cache=await caches.open(shellCache);const response=await fetch("/offline",{cache:"reload"});if(!response.ok)return;const html=await response.clone().text();await cache.put("/offline",response);const assets=[...html.matchAll(/(?:src|href)="([^\"]+)"/g)].map(match=>match[1]).filter(path=>path.startsWith("/_next/static/")).slice(0,100);await Promise.allSettled(assets.map(async path=>{const file=await fetch(path);if(file.ok)await cache.put(path,file);}));}
function binding(write, value) {
  return new Promise((resolve) => {
    const request = indexedDB.open(storeName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("binding");
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("binding", write ? "readwrite" : "readonly");
      const store = tx.objectStore("binding");
      const operation = write ? store.put(value, "user") : store.get("user");
      operation.onsuccess = () => resolve(write ? value : operation.result);
      operation.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    };
  });
}
self.addEventListener("install", event => {self.skipWaiting();event.waitUntil(prepareOfflineShell().catch(()=>{}));});
// Only a generic offline page and public build assets are cached by the worker.
// Account-scoped materials/drafts use the separate IndexedDB store in the app.
self.addEventListener("fetch", event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  // Next's timestamped development chunks are mutable and must reach the
  // browser directly, without a worker stream or Cache Storage dependency.
  if (url.pathname.startsWith("/_next/static/") && url.searchParams.has("v")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(async () => {
      if (url.pathname !== "/offline") return Response.redirect(new URL("/offline", self.location.origin).href, 302);
      return (await caches.match("/offline")) ?? Response.error();
    }));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/pdfjs/")) {
    let copy;
    const response = (async () => {
      try {
        const response = await fetch(request);
        if (response.ok) copy = response.clone();
        return response;
      } catch (error) {
        try {
          const cached = await (await caches.open(shellCache)).match(request) ?? await (await caches.open(assetCache)).match(request);
          if (cached) return cached;
        } catch { /* Storage failure cannot recover an offline network request. */ }
        throw error;
      }
    })();
    event.respondWith(response);
    // Register lifetime work during dispatch, but never await it in the response.
    // Failed or stalled cache storage cannot gate delivery of the app's scripts.
    event.waitUntil(response.then(async () => {
      if (!copy) return;
      const cache = await caches.open(assetCache);
      const keys = await cache.keys();
      if (keys.length > 180) for (const old of keys.slice(0, keys.length - 160)) await cache.delete(old);
      await cache.put(request, copy);
    }).catch(() => {}));
  }
});
self.addEventListener("activate", (event) =>
  event.waitUntil((async () => {
    try {
      for (const name of await caches.keys()) {
        if ((name.startsWith("edunexus-offline-shell-") || name.startsWith("edunexus-offline-assets-")) && name !== shellCache && name !== assetCache) await caches.delete(name);
      }
    } catch { /* Optional cleanup must not block recovery on broken storage. */ }
    await self.clients.claim();
  })()),
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "bind-user") {
    const user = event.data.user;
    event.waitUntil(
      binding(
        true,
        typeof user === "string" && /^[0-9a-f-]{36}$/i.test(user) ? user : null,
      ),
    );
  }
});
self.addEventListener("push", (event) =>
  event.waitUntil(
    (async () => {
      let payload;
      try {
        payload = event.data?.json();
      } catch {
        return;
      }
      if(payload?.expires_at&&Date.now()/1000>=payload.expires_at)return;
      if (!payload?.user_id || (await binding(false)) !== payload.user_id)
        return;
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      if (windows.some((client) => client.visibilityState === "visible"))
        return;
      let target;
      try {
        target = new URL(payload.url || "/notifications", self.location.origin);
      } catch {
        return;
      }
      if (target.origin !== self.location.origin)
        target = new URL("/notifications", self.location.origin);
      await self.registration.showNotification(payload.title || "EduNexus", {
        body: payload.body || "You have a new update.",
        tag: `edunexus-${payload.notification_id}`,
        icon: "/icon-192.png",
        badge: "/edunexus-mark.png",
        data: { url: target.href, user_id: payload.user_id },
      });
    })(),
  ),
);
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      if ((await binding(false)) !== event.notification.data?.user_id) return;
      const url = new URL(
        event.notification.data?.url || "/notifications",
        self.location.origin,
      );
      if (url.origin !== self.location.origin) return;
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = windows.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (existing) {
        await existing.navigate(url.href);
        await existing.focus();
      } else await self.clients.openWindow(url.href);
    })(),
  );
});
