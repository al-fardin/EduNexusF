# Login handoff and cache failure correction - 2026-11-28

The reported console error identified a real failure path: waiting for
`Cache.put()` before returning an otherwise successful JavaScript response made
cache-storage failure break application startup. Login could then return to a
guest HTML page without a functioning client application.

## Changes

- Static network responses are returned independently of background cache work.
  Failed or stalled cache open/enumeration/writes cannot discard the response.
  Timestamped Next development chunks bypass worker caching entirely.
- Cache version v3 replaces older build caches. Cleanup failure cannot prevent
  the repaired worker from activating. Recovery does not interrupt a filled or
  pending login form.
- Sign-in now enters `/dashboard`, a dedicated AuthGuard/WorkspaceHome route.
  Its initial HTML contains the authentication loader instead of the public
  landing page. Both React and fallback sign-in use this protected entry.
  Valid deep return paths remain supported. App Home/logo links use `/dashboard`.
- A React hydration mismatch caused by a component inside a native template was
  removed. The inert loading scene now uses a hidden container; cloned SVG IDs
  are rewritten to avoid collisions. Animation artwork/styles are retained.

## Verification

- All 113 frontend tests, lint and TypeScript passed. Production build generated
  all 32 static pages and the dynamic routes.
- Real API/original-account browser checks passed under normal storage,
  deliberately rejected `Cache.put()` and deliberately rejected cache open.
  Faults were injected into the actual service worker, without API mocks.
- Each case covered sign-in, dashboard, refresh, calendar navigation/refresh,
  real token rotation and a restored browser session. A MutationObserver watched
  every document during handoff: **no guest landing DOM was ever rendered**.
  No hydration/runtime errors or failed application scripts were recorded.
- Both normal React and unhydrated fallback sign-in independently reached the
  protected dashboard with zero guest landing frames. Existing credentials were
  handled only in memory; temporary verification sessions were signed out.
- Original database records, account credentials and animation styles remain
  unchanged. Tests verified the account's own class count against the real API.
