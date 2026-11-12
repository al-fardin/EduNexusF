# Workspace/security release verification

## Checks performed

- All 49 migrations applied to a fresh disposable PostgreSQL 17 database.
- Complete Linux Go race suite, including new account-security, quota, report and moderation integration tests, passed. Go vet and compile checks passed.
- New coverage includes one-use refresh rotation under concurrent requests, immediate access revocation, hashed refresh credentials, encrypted account-bound MFA secrets, RFC 6238 vectors, factor replay/lockout and single-use recovery codes. Enrollment requires proof before enabling MFA.
- Academic tests cover task membership/completion, simultaneous quota-bound uploads, report draft/published/withdrawn privacy, immutable snapshots excluding unpublished exam marks, and owner/co-teacher boundaries. Moderation tests cover participant block ownership, private-history isolation, report receipts, independent reviewers and version/history checks.
- Frontend lint, TypeScript and 36 Node tests passed, including internal notification-return validation and role-sensitive classroom controls. Production Next builds passed. Production dependency audit reported no vulnerabilities; the full development dependency audit still reports existing moderate tooling advisories.
- Installed Chrome headless tests with isolated fixture users passed report preview/publish/student access, actionable task links, co-teacher restrictions, storage quotas/reference preview, message reports/independent moderation, message/call blocking, authenticator enrollment/recovery login and device-revoke UI. Revoked access/refresh requests were rejected while the current device remained valid.
- Loaded layouts passed 390×844, 844×390, 768×1024 and 1440×900 widths, plus Bengali at 20 px and dark mode. The guide/changelog were exercised.
- The final card-action and student-selector checks also passed as isolated component renders in installed headless Chrome, without starting an application server or making network requests. These use the actual component source with routing/query/menu-portal dependencies stubbed: owner/archive/co-teacher/student action visibility, exact English/Bengali accessible selector names, focus, required validation and roster selection were verified. This is component verification, not proof that the running QA server restarted onto the final build.
- One- and three-page A4 PDF exports were inspected with Poppler, including Bengali shaping, pagination and footer placement. PDF pages are intentionally image based with a separate text export.
- Local testing APK 1.5.0 (version code 7) compiled and passed v2/v3 signature verification. Production signing/Firebase/real-device push prerequisites remain as described in the prior Android release guide.

## Existing data and operations

The existing PostgreSQL database was backed up before migrations 46–49. Academic write tests used only `edunexus_features` or the disposable test database. Existing-data API checks use read-only PostgreSQL connections. New MFA fixtures use an explicitly isolated QA encryption key; the real workspace has a separately generated private key in its ignored `.env`.

For deployment, preserve the MFA encryption key, take a database/storage backup, and apply `scripts/database/apply-learning-features.ps1` through migration 49 before starting the new API. Keep the database, material/message storage and the protected key backup together in recovery procedures. Do not reuse fixture JWT/encryption keys or publish QA test databases.

For Android production deployment, a stable HTTPS origin, production signing identity and Firebase configuration are still external prerequisites. No physical-device notification/upgrade verification is claimed for this release.
