/* Keep sign-in usable while React is delayed by an old or failed app chunk. */
(function () {
  document.addEventListener("submit", async function (event) {
    var form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.hasAttribute("data-edunexus-login") || form.dataset.hydrated === "true") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (form.dataset.loginBusy === "true" || !form.reportValidity()) return;
    var fields = new FormData(form);
    var email = String(fields.get("email") || "").trim();
    var password = String(fields.get("password") || "");
    if (!email || !password) return;
    var button = form.querySelector('button[type="submit"]');
    var oldLabel = button ? button.textContent : "Sign in";
    var error = form.querySelector("[data-login-fallback-error]");
    if (!error) {
      error = document.createElement("p");
      error.setAttribute("data-login-fallback-error", "");
      error.setAttribute("role", "alert");
      error.className = "rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive";
      form.insertBefore(error, button);
    }
    error.hidden = true;
    var template = document.querySelector("template[data-login-loading]");
    var overlay = template && template.content.firstElementChild ? template.content.firstElementChild.cloneNode(true) : null;
    if (overlay) document.body.appendChild(overlay);
    form.dataset.loginBusy = "true";
    form.setAttribute("aria-busy", "true");
    if (button) { button.disabled = true; button.textContent = "Signing in…"; }
    var entering = false;
    try {
      var response = await fetch("/api/auth/login", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email, password: password, code: String(fields.get("code") || "").trim() })
      });
      var body = await response.json();
      if (!form.isConnected && location.pathname !== "/login") return;
      if (!response.ok) throw new Error(typeof body.message === "string" ? body.message : "Unable to sign in.");
      var tokens = body.data;
      if (!tokens || typeof tokens.access_token !== "string" || !tokens.access_token || typeof tokens.refresh_token !== "string" || !tokens.refresh_token) throw new Error("Authentication tokens were not returned.");
      localStorage.setItem("access_token", tokens.access_token);
      localStorage.setItem("refresh_token", tokens.refresh_token);
      try { sessionStorage.setItem("en-verification-pending", "1"); } catch { /* Optional prompt marker. */ }
      entering = true;
      // The React handler preserves requested return paths once it is hydrated.
      // Before hydration, enter the same-origin workspace without trusting a URL.
      location.replace("/");
    } catch (failure) {
      if (form.isConnected) {
        error.textContent = failure instanceof Error ? failure.message : "Unable to connect to the server.";
        error.hidden = false;
      }
    } finally {
      if (!entering) {
        if (overlay) overlay.remove();
        delete form.dataset.loginBusy;
        form.removeAttribute("aria-busy");
        if (button) { button.disabled = false; button.textContent = oldLabel; }
      }
    }
  }, true);
})();
