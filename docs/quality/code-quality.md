# Code quality and verification

The quality workflow runs for pushes to `main`, pull requests and manual dispatch.
It checks frontend lint (zero warnings), TypeScript, Node tests and production
build; Go formatting, vet and race tests against a fresh PostgreSQL database;
desktop unit tests; and Java formatting plus Android compilation/signature.
These checks reduce regression risk. They are not proof of perfect code,
complete test coverage, production load capacity or physical-device behavior.
Workflow actions use verified release commit SHAs. Android setup installs current
platform tools and the explicitly required SDK packages, not the retired `tools`
package. Review upstream release notes before updating action pins.

Verified locally on 2026-11-06: frontend lint with zero errors/warnings,
TypeScript, 16 Node tests and production build; all scoped Go tests including
live read-only routes, Linux race tests and vet; migrations 1–36 in a new database;
15 desktop tests passed with two platform-specific skips; Java formatting and
Android APK build/signature. Browser checks covered profile dialog, message send,
held emoji, 390px layout without overflow, and exam consent surviving refresh and
returning to the exam list. Only isolated fixture accounts were used for UI writes.

## Review on 2026-11-18

This review fixes the following reproduced failures without adding features:

- Restricted local storage no longer prevents reading a session fallback or
  interrupts cleanup after submission. Both storage copies are account-scoped;
  recovery chooses the newest valid copy. Unowned legacy session drafts are not
  adopted by a signed-in account. Session-only saves still warn that recovery
  after closing the browser is unavailable.
- Editing an imported question retains its trusted bank provenance and applies
  topic/difficulty changes. File imports still cannot supply bank provenance.
- Import/readiness validation follows the server's UTF-8 byte limits, validates
  question identifiers, and rejects noncanonical option-image indices.
- Failed or superseded readiness checks cannot retain a successful report.
  Cached checks are scoped to the account, class and draft/exam selection.
- Coding-set approval hydrates tester metadata through its existing transaction,
  avoiding connection-pool starvation. A real PostgreSQL regression runs the
  entire create/preview/approve flow with `MaxConns=1` and a bounded deadline.

Verification passed: zero-warning frontend lint, TypeScript, 85 Node tests and
production build; scoped Go tests, vet and Linux race tests against isolated
PostgreSQL; 170 authenticated GETs against existing data with read-only connections.
Headless Chrome checked source components/libraries with mocked routing/data:
320/390/768/1440px layouts, Bengali, dark mode, enlarged text, keyboard controls,
file input/image processing, offline draft persistence, blocked-storage fallback,
account isolation and browser Back. These browser checks did not use a live Next
server. GitHub CI also checks desktop and Android separately.

Regression tests reproduce the storage, import and approval failures before the
fixes. These checks cover the reviewed paths, not every possible codebase bug.
Existing user records are checked only through read-only database connections.
Physical-phone QA remains pending because no device is available.

## Red-team follow-up

The [production security baseline](production-security.md) adds migration 58,
cross-replica auth budgets, authenticated proxy identity, production config/TLS
guards, restricted CORS and native-tester defaults, and deployment-isolation CI.

The [2026-11-23 security review](security-review-2026-11-23.md) adds refresh
digest rejection, atomic hashed email verification, private resend responses,
concurrency-safe realtime ticket budgets and an origin-bound API proxy. Quality
CI also checks npm advisories and reachable Go vulnerabilities.

The [2026-11-19 red-team report](red-team-verification.md) records confirmed
authorization/recovery failures, fixes, regression coverage and remaining limits.
Paired database/uploads restore and restored application routes now run in quality
CI, alongside bounded tester-parser fuzzing.

## Local checks

Verification on 2026-11-12 adds migration 42, 32 frontend tests, isolated academic
permission/conflict tests, a 501-student gradebook/progress check, concurrent exam
replay testing, private diagnostics and a successful database/uploads recovery
cycle. See [academic release operations](academic-release-operations.md) for the
measured scope and operational setup.

On 2026-11-11, frontend lint, TypeScript, 29 Node tests and production builds
passed. Full Go tests, vet and Linux race tests passed against isolated PostgreSQL
fixtures, including migrations 1–41. Browser checks and operational limits for
the new features are recorded in the
[coursework workflow guide](../guides/coursework-workflows.md).

Additional checks on 2026-11-07 cover conversation tools, account-scoped offline
work and transactional teacher history. Migrations 1–38 passed in a fresh
database; the live database was backed up before applying 37–38. See
[LEARNING_WORKFLOWS.md](../guides/learning-workflows.md) for behavior, verification and the
remaining browser/device checks. These additions do not imply perfect coverage.

```powershell
cd F:\EduNexus\frontend
npm ci
npm run check
npm run build

cd F:\EduNexus
$env:EDUNEXUS_TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5432/edunexus_features?sslmode=disable'
go vet ./backend/internal/... ./backend/apps/...
go test -p 1 -count=1 ./backend/internal/... ./backend/apps/...
python -m unittest discover -s desktop-client/tests -v
.\android-app\FORMAT_JAVA.ps1 -Check
```

Integration fixtures accept only the explicitly named `edunexus_features` database.
Apply the full migration chain to a **new, disposable database** when checking
bootstrap. Do not replay historical migrations against the live database.
Existing live records can be checked separately with
`EDUNEXUS_REAL_READONLY_DATABASE_URL`; that test makes its connections read-only.
Use `EDUNEXUS_NEXT_DIST_DIR` for isolated builds while a development server runs.

`go test -race` also requires a compatible C toolchain. The installed Windows
MinGW runtime could not launch race binaries (`0xc0000139`); the same suite was
verified in a Linux Go container instead. GitHub runs race tests on Linux.

## Boundaries and invariants

- Settings separates account state, fields/dialog presentation and pure helpers.
  Late profile responses cannot restore a signed-out or different account.
- Messaging separates conversation navigation, thread presentation and composer/
  query state. Blob URL cleanup, upload cancellation and retry IDs stay with their
  state owner. The layout and API contract are preserved.
- Exam list, teacher authoring and student taking live in separate modules.
  Restoration verifies live attempts before opening the editor, retains drafts
  on network errors and returns to consent after a missing attempt. Canceled or
  previous-account requests cannot overwrite another session's navigation.
  Autosave callbacks include their current state/clock dependencies.
- Server startup requires a non-placeholder JWT secret of at least 32 bytes and
  a positive token duration. Missing configuration fails before connecting to the
  database or listening. Secrets are never included in validation errors.
- Android call HTTP requests are isolated from service lifecycle. Hangup captures
  its original call/session credentials so a late request cannot target a new
  call. Native diagnostics report operation/error categories without token,
  message, URL or password contents. Heartbeat failure logs are deduplicated.
- Vendored Monaco/PDF.js and generated Next outputs are excluded from source
  linting. React hook checks remain enabled. Only CommonJS test files permit
  Node's `require` syntax.

Generate a new signing secret for a **new deployment**, outside source control:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Set it as `JWT_SECRET` in the deployment environment. Existing secret values are
not rotated by this change; deliberately rotating one invalidates existing access
tokens. Android background capture/push and public TURN reliability still need
real devices and a configured HTTPS deployment, as described in the calling docs.
