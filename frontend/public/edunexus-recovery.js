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
    var form = document.querySelector("[data-edunexus-login]");
    var password = form && form.querySelector('input[name="password"]');
    if (form && (form.dataset.loginBusy === "true" || form.closest('main[aria-busy="true"]') || (password && password.value))) return;
    try {
      if (sessionStorage.getItem("edunexus:asset-recovery:v3")) return;
      sessionStorage.setItem("edunexus:asset-recovery:v3", "1");
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
