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
    var template = document.querySelector("[data-login-loading]");
    var scene = template && (template.content ? template.content.firstElementChild : template.firstElementChild);
    var overlay = scene ? scene.cloneNode(true) : null;
    if (overlay) {
      overlay.querySelectorAll("[id]").forEach(function (node) {
        var previous = node.id, next = previous + "-login-fallback";
        node.id = next;
        overlay.querySelectorAll("[fill], [stroke]").forEach(function (shape) {
          ["fill", "stroke"].forEach(function (attribute) {
            var value = shape.getAttribute(attribute);
            if (value) shape.setAttribute(attribute, value.replaceAll("url(#" + previous + ")", "url(#" + next + ")"));
          });
        });
      });
    }
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
      location.replace("/dashboard");
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
