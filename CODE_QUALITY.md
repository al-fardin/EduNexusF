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

## Local checks

Additional checks on 2026-11-07 cover conversation tools, account-scoped offline
work and transactional teacher history. Migrations 1–38 passed in a fresh
database; the live database was backed up before applying 37–38. See
[LEARNING_WORKFLOWS.md](LEARNING_WORKFLOWS.md) for behavior, verification and the
remaining browser/device checks. These additions do not imply perfect coverage.

```powershell
cd F:\EduNexus\frontend
npm ci
npm run check
npm run build

cd F:\EduNexus
$env:EDUNEXUS_TEST_DATABASE_URL='postgres://postgres:postgres@127.0.0.1:5432/edunexus_features?sslmode=disable'
go vet ./internal/... ./apps/...
go test -p 1 -count=1 ./internal/... ./apps/...
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
