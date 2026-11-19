# Red-team verification — 2026-11-19

Scope: EduNexus repository, real registered API middleware, isolated PostgreSQL
fixtures, desktop tester validation and paired database/uploads recovery. No
external accounts were attacked, no real email/AI calls were sent, and existing
user data was not changed by the adversarial tests.

## Confirmed failures and fixes

| Finding | Before | Result after fix |
|---|---|---|
| Material authorization failed open | An authorization helper wrote JSON and returned nil, so download or mutation handlers could continue after denial. | Authorization returns a non-nil mapped error. Removed memberships and student delete attempts stop before file operations. Positive file downloads run on Linux; fasthttp file caching prevents immediate Windows TempDir cleanup. |
| Co-teacher path casing bypass | Fiber matched uppercase classroom routes while staff policy matched only lowercase paths; a restricted teacher received HTTP 200. | Policy canonicalizes path case. Real-router tests cover lowercase/mixed/uppercase bank, gradebook, attendance and reports with owner and denied actors. |
| Tester capability outlived class access | A previously issued download ticket still worked after membership removal, account suspension, class archival or an invalid cross-class tester association. | Download consumption rechecks current membership, account, class, exam and tester scope. Eight concurrent consumers receive exactly one success. |
| Password recovery exposed account existence and localhost links | Unknown emails produced a distinct error; reset emails always linked to localhost. | Same public response for existing/missing accounts and provider failures; reset links use validated FRONTEND_URL. This does not claim constant-time responses. |
| Reset capabilities stored in plaintext | Reading the reset-token table exposed usable credentials. | Newly issued tokens are SHA-256 digests at rest. Supplying a stored digest as a bearer token is rejected; old emailed links remain compatible until expiry. Existing legacy plaintext rows are not silently rewritten. |
| Anonymous email endpoints lacked throttling | Repeated reset/resend requests could repeatedly trigger provider work. | Independent per-IP, per-process minute budgets: reset request/resend 5, registration/reset completion/POST verification 20. Forwarded headers cannot rotate the limiter identity. Existing login limiter remains. |
| Desktop accepted only MZ plus a matching hash | A malformed executable with a matching server digest reached the approval screen. | PE offset/signature are also validated. Corrupt, truncated, fake-PE and cancelled downloads cannot execute. Explicit approval remains required. |
| Backup verification omitted blobs | A database-only restore could succeed with missing uploads. | Production-named dump pairs require an archive. Verification extracts only regular files/directories into a fresh temporary directory and checks referenced blob existence/size and stored message hashes. Checksums bind the actual requested file, not a path supplied by the sidecar. |

## Seven review areas

1. **Authorization:** real JWT routes, restricted co-teacher, anonymous access,
   cross-class material IDs, removed memberships, student mutations, existing
   roll/section audience and assignment-result isolation tests.
2. **Exam integrity:** 40 concurrent students and 160 start/save/submit/replay
   operations; conflicting revisions, repeated submit, mobile consent, coding
   restrictions, deadlines and required answers. Started attempts intentionally
   keep eligibility after an audience edit; class/account revocation still wins.
3. **Sessions:** refresh rotation, logout/revocation, factor replay/lockout,
   account-scoped offline storage. New reset tests assert one concurrent success,
   revoked access/refresh credentials and rejection of already-used legacy tokens.
4. **Files/testers:** bounded image/import parsers, unsafe source paths, PE
   integrity and one-use tickets. Bounded Go fuzzing runs against the tester
   parser; generated inputs are never executed. Teacher executables still run as
   the desktop user with process limits; they are not a security sandbox.
5. **Failures/recovery:** frontend network/server errors, offline draft boundaries
   and account switching; exam handlers rebuilt between requests to prove recovery
   and replay rely on committed database state. This is not a full OS crash or
   mobile-radio interruption simulation.
6. **Abuse/concurrency:** 60 simultaneous message sends yield 40 accepted/20
   throttled, without duplicate retries. Forty tutor requests yield 30 accepted/10
   throttled and 30 mock-provider calls; completed retries do not call the provider.
   These are bounded regressions, not a production capacity benchmark.
7. **Paired restore:** migrations through 57 in a new network-isolated PostgreSQL
   container, fresh dump/archive restore, then real API login/account/material,
   submission, message attachment and exam reads. Missing files, traversal/symlink archives
   and tampered/checksum-substitution archives must fail. Quality CI now runs
   paired recovery plus application checks on every change.

## Checks and limits

Frontend lint/TypeScript/85 tests; scoped Go tests/vet and Linux race suite;
desktop unit tests (16 passed, two example-executable execution tests skipped);
Two bounded tester-fuzzing runs (20s + 10s; 202,692 executions); paired restore/application verification. The
existing database is verified separately using read-only connections.

Real SMTP/AI delivery, physical Android behavior, deployment proxy rate-limit
identity, multiple API replicas and sustained production load still require the
actual deployment/device. In-memory auth limits are per API instance; configure
shared edge throttling before running multiple replicas. Email response timing
is not constant-time. Test success is not proof that every attack is prevented.

The recovery check runs only on its newly created `edunexus_restore_*` database.
`BACKUP_RESTORE_REPORT` and `BACKUP_RESTORE_UPLOADS_DIR` optionally retain that
verified copy for application checks; the destination directory must be new.
An ordinary verification drops only the newly created verification database.
Failed restores are retained for inspection in the disposable environment.
