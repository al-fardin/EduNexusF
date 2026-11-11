# Release verification — 2026-11-04

Implemented follow-up features: realtime messaging (replies, edits, tombstone
deletion, search, typing and seen receipts); classwork topics; exam previews and
controlled answer explanations; device push; mobile previews/uploads/retry; and
web/Android release tooling. Existing assignment version/late-work policies,
pinned announcements, result publication/PDF downloads and desktop exam rules
remain in place.

## Verified locally

- Scoped Go suite: `go test -p 1 ./backend/internal/... ./backend/apps/...` passed with the isolated
  `edunexus_features` database. Includes cross-class/account authorization, exam
  answer-release boundaries, reply/edit/search/seen behavior, push device binding,
  encrypted Web Push, mocked data-only FCM delivery, preference/read suppression
  and duplicate-delivery checks. No external provider messages were sent.
- Complete-router WebSocket test passed: JWT-protected ticket request, browser
  handshake without an Authorization header, scoped PostgreSQL notification
  delivery and typing identity. The router-order regression is covered.
  Listener outages disconnect clients so reconnect restores polling/cache refresh.
- Existing local database: 88 authenticated GET requests passed over database
  connections forced into read-only mode. Test writes were isolated to fixtures.
- Feature migration 34 applied to the local database after backup. Fresh database
  bootstrap migrations 1–34 and a second idempotent migration run passed.
- Real database dump restored successfully into a new verification database.
  No live database was overwritten. Backup and restore scripts retain checksums.
- Next.js 16.4.5 production build, TypeScript, targeted ESLint checks and four
  existing frontend draft/client-ID tests passed. Runtime npm audit: zero
  findings. Development lint dependencies still have 16 moderate minimatch-related
  findings; no forced incompatible lint downgrade was applied.
- Linux API and frontend Docker images built. Standalone frontend login/assets,
  PDF worker, API health and inter-container `/api` proxy were checked at runtime.
  Base compose and optional coding-runner override configurations validated.
- Browser checks with isolated teacher/student accounts: send/edit/search/reply,
  seen state, shared PDF upload/preview, topic creation/resource placement/filter,
  offline retry. At 390 px, PDF dialog stayed within the page width. Local
  screenshots are under ignored `release-builds/`.
- Android 1.2.0 / version code 3 Firebase-capable debug APK built with Gradle 9.1.0,
  JDK 25 and Android SDK 35/build-tools 36.0.0. APK signature verification passed.
  Copy: `release-builds/android/EduNexus-debug.apk`; also served from
  `/downloads/EduNexus-debug.apk` by the local frontend.

## Setup still requiring accounts or devices

No hosting or Firebase project exists yet, as confirmed by the user. HTTPS
deployment, Firebase delivery to a real phone, SMTP provider delivery and a
permanently signed production release were **not** claimed as live or tested.
Push integrations use local mocks for delivery verification. The signed GitHub
workflow needs the owner's release keystore and optional Firebase configuration.
The APK has not been exercised on a physical Android device during this check.

See [deployment instructions](../../deploy/README.md). The default deployment excludes
Docker-daemon access; server-side coding execution requires the documented
dedicated-host runner override. Local Windows exam execution remains unchanged.
