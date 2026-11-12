# Semester and Android release verification

## Automated checks

This change was checked with all 45 migrations against a disposable PostgreSQL 17 database and the complete Go race suite. New migrations also passed down/up verification. Integration coverage includes semester ownership, idempotent rollover, independent files/testers, missing-file rollback, question statistics, student privacy, similarity notes without grade changes, frozen recheck snapshots, concurrent edit rejection and accessible material search.

Frontend lint, TypeScript and 33 Node tests passed, followed by the production build. Android's local 1.4.0 build (version code 6) compiled and passed APK signature verification. JVM update-policy tests and five release-manifest generator tests cover downgrade, package, hash, signing identity, size and debug-release rejection.

Browser verification uses fixture accounts and the isolated `edunexus_features` database, with SMTP and push disabled. Its optional simulated update manifest is not a published release. Production account records are not used for write tests.

Headless installed-Chrome checks passed semester creation/copy/archive/catalogue/restore, question analysis, similarity notes, teacher-authored accessible text/captions and in-material search, student recheck creation, refreshed review links, teacher decisions and immutable history. Loaded layouts were checked at 390×844, 844×390, 768×1024 and 1440×900, including Bengali at 20 px and dark mode. A simulated native bridge checked exact update parameters and retryable error display; this was not an Android installation test.

An additional 108 authenticated GET requests passed against the existing database using read-only PostgreSQL connections. This exposed a semester-list DISTINCT/ORDER BY mismatch; the query and its regression coverage were corrected before release.

## Android release procedure

`android-app/version.properties` is the source of the app version. Increase version code for each release; keep the same production signing identity. Never commit keystores, passwords, Firebase credentials or generated APKs.

1. Configure a stable HTTPS workspace origin, a production signing keystore/passwords and Firebase configuration for background push.
2. Run `android-app/CHECK_RELEASE.ps1 -ServerUrl 'https://your-workspace.example'` to inspect prerequisite presence. These flags do not certify a built artifact or actual push delivery.
3. Build with `android-app/BUILD_ANDROID_FCM.ps1 -Release` using the documented signing environment. The release build invokes `deploy/android-manifest.py`, which inspects the actual signed APK and writes its measured version, size, SHA-256 and signing-certificate fingerprint. Debuggable packages/debug certificates are rejected.
4. Publish the APK at `/downloads/EduNexus-release.apk` on the same HTTPS origin, then point the API's `ANDROID_RELEASE_MANIFEST` at its generated JSON manifest. Publish the artifact before advertising the manifest. Do not use the QA simulation manifest.
5. On a connected test phone run `android-app/CHECK_DEVICE.ps1`, install the release, and test signed upgrades, notification permission, background/locked-screen delivery, notification navigation, uploads, keyboard and back navigation.

The 1.4.0 native client exposes **Verify & install** for advertised updates. It downloads only the canonical same-origin HTTPS path without redirects, enforces the declared size/hash, and checks the archive's package, exact offered version and certificate against the installed app. Android then asks the user to approve installation. It does not silently install. Older clients can download the APK manually. Signing-key rotation is not supported by this update policy.

The locally built debug APK is for testing; it is not a production or Firebase-verified release. A debug installation cannot upgrade to a differently signed production app. Do not automatically uninstall it or delete user data.

## Outstanding external verification

No stable production HTTPS origin, production signing inputs, Firebase configuration or connected ADB phone were available for this change. Production signing, physical installation/upgrade and background notification delivery remain pending those inputs. Simulated browser bridge tests cannot establish real-device behavior.
