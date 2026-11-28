# Codebase bug audit — 2026-11-28

This review follows the login/cache repair in `c9f423a`. It checks the current
frontend, backend and local Docker database flows; it is not a guarantee that
every possible defect or vulnerability has been eliminated.

## Bugs corrected in this change

### Verified offline profile after access-token rotation

`authService.me()` previously captured the access token before making its
request. When the API interceptor refreshed that token and retried the request,
the successful profile response was still associated with the old token.
The offline-session guard correctly rejected that stale token, but consequently
did not update the verified profile or its verification time.

The service now uses the authorization header of the successful request,
including AxiosHeaders and normalized header names. The existing guard still
rejects late responses from a previous account. Regression tests cover token
rotation, account switching and both header representations.

### Stalled sign-in requests

An unresponsive connection could leave sign-in pending indefinitely. React
sign-in and the independent pre-hydration fallback now have a 20-second request
timeout. Profile verification has a 10-second request timeout; the existing
refresh client already has its own bounded timeout. Failures release the loading
scene and restore the sign-in button. The fallback reports a retryable timeout.
No automatic retry of the credential submission was added.

### Invalid Android notification bridge status

Settings directly parsed the native bridge response during rendering. Malformed
JSON from an older or partially initialized bridge could crash the page. A shared
parser now validates the object, boolean permission flags and optional account
binding. Settings and background notification binding handle invalid status
without throwing. Valid bindings and notification permissions remain intact.

## Verification

- Frontend lint, TypeScript and 121 tests passed.
- An isolated production build generated all 32 static pages and dynamic routes.
- Full backend integration suite passed against `edunexus_features`:
  `go test -p 1 -count=1 ./internal/... ./apps/...`.
- `go vet ./internal/... ./apps/...` passed.
- Full backend race suite passed under Linux Go 1.26.11 in Docker:
  `go test -race -p 1 -count=1 -timeout=8m ./internal/... ./apps/...`.
  The source was mounted read-only; CPU/memory were bounded and the database
  connection targeted the separate test database. Windows race executables
  could not start because of a runtime loader error; the completed Linux run
  supplies the race-test result.
- `TestExistingDatabaseReadOnlyRoutes` passed 209 authenticated GET requests
  against the original `edunexus` database with database-enforced read-only
  connections. Routes covered workspace, classroom, materials, assignments,
  exams, roster, sections, question bank, analytics, notifications, institutions,
  tutoring and call configuration.
- Real Chrome sign-in checks against the original API passed under normal
  storage, rejected cache writes and rejected cache opens. Each exercised
  dashboard rendering/refresh, calendar navigation/refresh, token rotation and
  session restoration. No guest landing frame, client runtime error or failed
  application script occurred. Temporary login sessions were signed out.
- Chrome checks intercepted and stalled credential submissions without sending
  them to the backend. Both hydrated React and unhydrated fallback recovered
  after the timeout, removed the visible loader and allowed retry.
- A 390-pixel mobile Settings check used the real account API with a deliberately
  malformed native notification bridge response. Settings and notification
  controls rendered without a runtime error or horizontal overflow.
- `npm audit --json` reported zero known dependency vulnerabilities.
- `python scripts/qa/check-deployment.py` passed.
- `python scripts/qa/test_android_manifest.py` passed all five tests.

## Scope and limits

The fixes retain the current animation, class features, exam rules and database
schema. Original academic records and credentials were not edited; destructive
integration fixtures were confined to `edunexus_features`. Browser verification
artifacts and temporary tooling stay under ignored `release-builds/`.

Automated tests exercise existing authentication, authorization, API proxy,
upload validation, refresh concurrency, audience selection, exam submission and
offline safeguards. Passing tests and a clean dependency audit do not establish
complete security. This run did not perform physical Android background-call
testing, production hosting validation or an independent penetration test.
