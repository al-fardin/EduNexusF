# Login button correction - 2026-11-28

The hydration readiness gate added in the previous change could leave Sign in
disabled when the application bundle did not hydrate. The gate is removed from
the button. Pending/entering states still prevent duplicate submissions.

An independent same-origin login handler supports the unhydrated form. It sends
the same JSON POST to the existing authentication proxy, shows a clone of the
existing login animation, restores the button on failure and enters the local
workspace on success. Hydrated forms continue using the existing React handler
and its requested return path. The fallback enters `/` without accepting a URL
from the query string. No authentication checks are bypassed.

This supersedes the disabled-until-hydration behavior described in
[the earlier cache recovery report](login-cache-recovery-2026-11-28.md).

## Verification

- Actual existing-account sign-in through the real API returned 200 and rendered
  the original-account dashboard, both with normal React hydration and with the
  React chunks deliberately blocked. No API mocks were used for these checks.
- Credentials were read from an existing local submission in memory only; they
  were not embedded in test source, printed, committed or persisted as artifacts.
  The two temporary login sessions created by these checks were logged out.
- Added regressions for failed submission recovery, successful token handoff,
  hydrated-handler isolation and duplicate-submit suppression.
- Lint, TypeScript and all 108 tests passed; production build generated all 31
  static pages and the dynamic routes.
- Animation styles, database data and account credentials are unchanged.
