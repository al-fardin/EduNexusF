/* Independent of the application bundle: recover stale offline JavaScript. */
(function () {
  if (location.pathname === "/login") {
    var url = new URL(location.href);
    if (url.searchParams.has("password") || url.searchParams.has("code")) {
      url.searchParams.delete("password");
      url.searchParams.delete("code");
      history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    }
  }
  if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
  var controlled = Boolean(navigator.serviceWorker.controller);
  var reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", function () {
    if (!controlled) { controlled = true; return; }
    if (reloading) return;
    try {
      if (sessionStorage.getItem("edunexus:asset-recovery:v2")) return;
      sessionStorage.setItem("edunexus:asset-recovery:v2", "1");
    } catch { /* A worker replacement happens once even without storage. */ }
    reloading = true;
    location.reload();
  });
  navigator.serviceWorker.register("/edunexus-sw.js", {
    scope: "/", updateViaCache: "none"
  }).then(function (registration) { return registration.update(); }).catch(function () {
    /* Offline visits keep their existing shell and saved work. */
  });
})();
