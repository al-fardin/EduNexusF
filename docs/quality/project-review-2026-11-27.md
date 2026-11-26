# Project review — 2026-11-27

Repository-wide automated checks and targeted source review covered authentication,
classroom navigation, assignments, exams, messaging, offline work, notifications,
the desktop bridge and Android update boundaries. Frontend copy was reviewed
across the application routes and shared components. This is a review of the
tested paths, not a claim that every possible defect has been eliminated.

## Fixed behavior

- Concurrent unauthorized requests now share both the refresh request and its
  token rotation. Previously, the first waiting request saved the new refresh
  token, causing the remaining requests to reject the same successful refresh.
  A late response still cannot replace a different login.
- Request progress settles each HTTP attempt before authentication retries it.
  Failed refreshes no longer leave saving active; successful retries no longer
  decrement unrelated requests. HTTP errors also clear stale connection warnings
  when the server has become reachable again.
- Class archive, restore, deletion and leaving invalidate Home, Files and Tasks
  alongside class lists. Pagination checks the refreshed page before moving back,
  so archiving the last card on a page does not incorrectly change pages.
- Notification links use the existing destination allowlist, including invitation
  destinations. Login return paths also preserve Planner, personal notes,
  institutions, class creation and Trash. External redirects remain rejected.
- Registration uses native form validation and Enter submission, blocks repeat
  submissions while pending, supplies autocomplete hints and shows success
  inline. Email verification can be retried after a temporary failure.
- The desktop pairing bridge rejects malformed IPv6/server addresses with HTTP
  400 instead of dropping the connection with an uncaught parser exception.
- Assignment downloads retain their object URL briefly so the browser can begin
  the download. Assignment rubric separators no longer contain a replacement
  character.

## Interface cleanup

The five authentication pages share one concise brand panel. Repeated slogans,
duplicate headings/badges and unnecessary implementation details were removed
from authentication, classrooms, coding, invitations and settings. Settings
actions use compact rows. The quick guide opens from Settings rather than
appearing automatically. Privacy information, monitoring consent, audience
defaults, deadlines and error recovery instructions remain available.

The unverified-email panel uses semantic theme colors; its heading contrast was
measured at 10.96:1 in light mode and 11.53:1 in dark mode. Brown theme tokens,
saved conversation themes, feature permissions and database schema are unchanged.

## Validation

- Frontend: zero-warning ESLint, TypeScript, 98 Node tests and production build.
  New regressions exercise real Axios interceptor ordering, concurrent token
  rotation, progress counters, class refresh/pagination and notification links.
- Go: `go vet` and the complete internal/application test suite passed against a
  separate PostgreSQL cluster with migrations 1–58 applied. Integration tests
  ran with `EDUNEXUS_TEST_DATABASE_URL` pointing only to `edunexus_features`.
- Chrome: 52 production-server checks, including six public routes at desktop
  and mobile sizes in both themes, registration validation/Enter/success,
  teacher and student workspaces, classwork refresh persistence, verification
  retry and both verification-panel themes. No page JavaScript errors or
  horizontal overflow were observed in these checks.
- Desktop: 19 tests ran successfully, with two existing platform-specific skips.
  The new malformed-address regression reproduces the connection failure before
  the fix and receives a structured HTTP 400 afterward.
- Windows launcher: 20 checks passed. Android manifest/release metadata: five
  checks passed; Java update package/version/hash/signature boundary checks passed.
- Deployment configuration isolation checks passed.

The additional Windows race-test run hit native loader exit `0xc0000139`
before test execution. This is recorded separately from the passing normal Go
suite; it is not counted as a race-test pass. The quality workflow runs the race
suite on Linux with a fresh PostgreSQL service.

Browser screenshots and results are local ignored artifacts under
`release-builds/professional-review/`. QA accounts and mutations were confined to
the isolated database. No existing user database was migrated or modified.
Physical-phone behavior and Windows native tester execution were not re-tested
in this review. No hosted provider or external email delivery was exercised.
