# Login hydration and stale asset recovery - 2026-11-28

The previous HMR fix did not cover browsers already controlled by the offline
worker. That worker served reused development chunk URLs from cache before the
network. Old JavaScript could therefore prevent React from attaching the login
submit handler. The form also lacked a method and could fall back to native GET
submission before hydration.

## Fix

- Static assets use network-first retrieval, with cached fallback on network
  failure. Offline shell/asset caches advance to v2; activation removes only old
  EduNexus build caches. Account drafts, stored materials, push bindings and
  database records are not cleared.
- An independent, same-origin recovery script registers/updates the worker even
  when the React bundle cannot start. Replacing an existing controller can cause
  one bounded recovery reload per browser session. First installation does not
  force a reload. No tokens or credentials are embedded in the script.
- Login uses POST explicitly and its submit button stays disabled until hydration
  completes. Old password/code query fields are removed from browser history on
  the login page. No credential values are included in this report.
- Animation components and animation styles remain unchanged.

## Verification

- Lint, TypeScript and all 104 frontend tests passed. Added regressions for stale
  online chunks, offline fallback, scoped old-cache eviction and bounded recovery.
- Production build generated all 31 static pages and the dynamic routes.
- Headless Chrome with service workers enabled: seeded a deliberately broken
  cached login chunk, reloaded and submitted invalid fixture credentials through
  the real API. The fresh chunk loaded, the request was POST, rejection cleared
  the pending overlay, and the auth background animation remained active. No
  repeated navigation or page errors occurred.
- With JavaScript disabled, the server-rendered login form uses POST and cannot
  submit before hydration.
- Actual original-account dashboard renders both existing class cards and clears
  its loading scene. This read-only dashboard check used a two-minute local QA
  token held in memory, not a user's password. It is separate from the real
  invalid-credential login test. No existing passwords or sessions were changed.
- Docker's original `edunexus` database retains five accounts and two classrooms.
