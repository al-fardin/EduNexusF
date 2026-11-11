# Mobile web and Android

The responsive web app and Android shell use the same account, API and database. Teachers can manage classes, questions, assignments, results and course sources from a phone. Coding exams require a desktop. MCQ-only exams accept phone entry only when the teacher enables **Allow phone access** while creating or editing an exam. Existing exams default to desktop. Questions and scheduling lock after the first student attempt.

Phone attempts use an explicit, stored `mobile` entry mode and rule acceptance, server deadlines, revision-checked saves and idempotent submission receipts. They do not use the desktop monitor or extension. The phone user-agent check guides access; it is not device attestation. Permission for portable entry is controlled by the teacher and MCQ validation runs on the server.

## Local testing APK

1. Start Docker and run `./scripts/database/apply-learning-features.ps1` from the repository root. This includes migration 27.
2. Run `./scripts/dev/start-local.ps1`. It starts the API and development web server if their ports are free and prints the LAN address. Use `-Production` to build a fresh production frontend before starting it; do not rebuild `.next` while a production server is running. Backend settings come from `.env` (created from `.env.example` with a random local JWT secret when absent); the web API proxy uses the same computer.
3. Connect the phone to the same Wi-Fi. Install `release-builds/android/EduNexus-debug.apk`, or open the printed APK download link on the phone. Android may ask you to allow installation from the browser/file manager.
4. Open EduNexus. This build initially connects to `http://192.168.0.231:3000`. If the PC address changes, choose **Workspace address** on the connection error screen. The debug app accepts HTTPS and private-network HTTP addresses.

The computer must stay on. If the phone cannot reach the printed web address, check Windows' private-network firewall permission for Node.js. The script does not change firewall rules. Port 3007 is reserved for the isolated verification environment; it is not the APK's default workspace.

Android 7.0/API 24 or newer is required. Native file upload, user-selected saving of authenticated blob downloads, system insets, keyboard spacing, back navigation and a connection retry screen are included. APK compilation, resource inspection and v2/v3 signature verification were performed locally. Physical-device behavior still needs a phone test; no attached device/emulator was available.

## Rebuild

Install a complete JDK and Google's Android command-line SDK. Install `platforms;android-35`, `build-tools;35.0.0` and `platform-tools` using `sdkmanager`. Then run:

```powershell
./android-app/BUILD_ANDROID.ps1 -SdkPath 'C:/Android/sdk' -ServerUrl 'http://192.168.0.231:3000'
```

The script uses Android's aapt2, javac, d8, zipalign and apksigner. It creates an ignored local debug key and writes `release-builds/android/EduNexus-debug.apk`; a copy is served locally under `/downloads/EduNexus-debug.apk`. Build output and signing keys are excluded from Git.

For a hosted release, provide the HTTPS origin, your release keystore, key alias and `EDUNEXUS_ANDROID_STOREPASS` / `EDUNEXUS_ANDROID_KEYPASS` environment variables:

```powershell
./android-app/BUILD_ANDROID.ps1 -Release -ServerUrl 'https://your-workspace.example' -SdkPath 'C:/Android/sdk' -Keystore 'C:/private/release.jks' -KeyAlias 'edunexus'
```

Release builds disable cleartext traffic, debugging and workspace changes. TLS errors are never bypassed. This is a web-connected Android shell, not an offline exam application.

## Verification

- Existing Docker database: 44 authenticated read-only API requests across teacher/student memberships; original data hashes checked before/after migrations.
- Write workflows: isolated `edunexus_features` database, including recovery, question bank, assignments, notification outbox, analytics, mocked OpenAI tutor and phone-exam admission/save/resume/submit tests.
- `EDUNEXUS_TEST_DATABASE_URL` enables the isolated integration suite; `EDUNEXUS_REAL_READONLY_DATABASE_URL` enables the existing-data read-only route test. Normal tests skip these checks when the variables are absent.
- SMTP and OpenAI delivery require server environment credentials. Tests use fakes/mocks; live email delivery and paid model calls were not exercised.

The production frontend build and TypeScript checks pass. The source lint check still reports nine existing React-hook errors (each offending line also exists in the previous HEAD); the default lint command additionally scans bundled Monaco vendor files. These are not claimed as passing checks.
