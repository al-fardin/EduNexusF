/* No academic data, authentication tokens, or exam responses are cached here. */
const storeName = "edunexus-push-binding";
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
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
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
        icon: "/edunexus-mark.svg",
        badge: "/edunexus-mark.svg",
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
self.addEventListener("fetch", (event) => {
  if (
    event.request.mode !== "navigate" ||
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(
          '<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EduNexus · Offline</title><style>body{font:16px system-ui;background:#faf7ff;color:#251333;display:grid;place-items:center;min-height:95vh;margin:0}main{padding:28px;max-width:340px}p{color:#766981;line-height:1.6}button{background:#7839b8;color:white;border:0;border-radius:10px;padding:13px 22px;font:inherit}</style><main><h1>You’re offline</h1><p>Check your connection, then try again.</p><button onclick="location.reload()">Retry</button></main></html>',
          {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Cache-Control": "no-store",
            },
          },
        ),
    ),
  );
});
