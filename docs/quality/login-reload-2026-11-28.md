# Local login reload fix - 2026-11-28

Browser debugger tracing reproduced repeated page reloads on both the previous
QA frontend and a newly started local frontend. The stack entered Turbopack's
`handleApply` restart case, which called `self.location.reload()`. This occurred
before signing in and was distinct from authentication redirects.

Both `npm run dev` and the local PowerShell launcher now explicitly select Next's
supported Webpack development server. Production builds remain unchanged. The
obsolete QA frontend was stopped and the managed local stack restarted.

## Running local stack

- Web: `http://localhost:3000/login`
- API: `http://127.0.0.1:8080`
- Database: Docker container `edunexus-postgres`, database `edunexus`, existing
  persistent volume `edunexus_postgres_data` on port 5432.
- Existing data retained: five accounts and two classrooms. No schema, password,
  account, session or classroom records were changed by verification.

## Verification

- Actual headless Chrome, without API mocks or HMR interception: landing Log in
  link reaches the login form and stays stable for ten seconds. An intentionally
  invalid credential submission reaches the real API, displays the rejection and
  clears its pending overlay without reloading. No page errors were recorded.
- Original account identity and both existing classes load through the real API.
  This read-only check used a locally signed two-minute verification token held
  only in memory; it did not change an existing user's credentials or sessions.
- Auth refresh and return-path regression tests passed (six tests).
- All 20 Windows launcher checks passed, including process ownership and cleanup.

Start the same managed stack with `scripts/dev/start-local.ps1`. Do not keep using
an old QA frontend whose backend points at an isolated test database.
