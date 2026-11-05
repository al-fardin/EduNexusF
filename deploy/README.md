# Web and Android release

The code can be prepared locally without hosting or Firebase accounts. A public
HTTPS origin and a Firebase project are required to verify Android background
delivery. No production deployment is performed by these scripts.

## Local Android testing

Start the database, API and frontend with the existing `START_LOCAL_MOBILE.ps1`.
Then run from the repository root:

```powershell
.\android-app\BUILD_ANDROID_FCM.ps1
```

The script selects the current LAN address. Your phone and computer must share
the network. The verified test APK is at
`release-builds/android/EduNexus-debug.apk` and `/downloads/EduNexus-debug.apk`.
The Firebase build needs Gradle 9.1.0, JDK 25, Android platform 35 and build tools
36.0.0. The existing `BUILD_ANDROID.ps1` also builds a lightweight shell without
Firebase dependencies. Never distribute the debug signing key as a production key.

## HTTPS web deployment

This optional Docker setup runs on a server with Docker and incoming ports 80/443.
It is separate from local `docker-compose.yml`. Point a domain's DNS to the server.
Copy `deploy/.env.example` to `deploy/.env`; set strong unique DB/JWT secrets and
the domain. Keep secrets out of Git. Create `deploy/secrets`,
`deploy/releases/downloads` before starting.

```powershell
docker compose --env-file deploy/.env -f deploy/compose.yml up -d --build
```

Caddy obtains HTTPS certificates and proxies the WebSocket endpoint to the API.
Database ports are private. Uploads and Postgres use persistent volumes; restarting
or rebuilding containers keeps data. Frontend API requests use `/api` and runtime
`BACKEND_API_URL`. Any alternative host must support a persistent Go process,
Postgres, durable file storage, HTTPS and WebSocket forwarding. A frontend-only
host does not run these backend services. Hosting availability and free limits
must be checked when an account is selected; this setup does not promise free hosting.

The migration service is idempotent for fresh installations and databases using
the shared migration ledger. For importing an older database, back it up first
and reconcile its already-applied schema with `edunexus_feature_migrations` before
running migrations 1–36. Do not rerun historical SQL against an untracked schema.

### Server-side coding runs

The API's existing code runner starts restricted Docker containers. The default
web stack does not mount a Docker socket, so MCQ, coursework and messaging work
without granting execution access. For server-side coding runs, use a dedicated
Linux execution host. Set `RUNNER_WORK_DIR=/var/lib/edunexus/runner` and
`DOCKER_GID` to the group ID from `stat -c %g /var/run/docker.sock` in `deploy/.env`.
Create that host directory with owner UID/GID 10001 before starting. Include
`-f deploy/compose.runner.yml` after `-f deploy/compose.yml` in the compose command.
The directory must have the same absolute path inside the API and on the Docker
host, because the runner uses bind mounts. The image includes the Docker CLI.
Pre-pull the language images listed in `internal/exam/runner_phase3.go` and
`workspace_phase6.go`; the daemon needs enough disk and memory for concurrent runs.

Docker socket access controls the execution host; use this override only on a
dedicated host. It is optional and is never mounted by the default web deployment.
The existing local Windows API continues using its installed Docker client.

## Notifications

Browser Web Push uses VAPID; Android uses Firebase HTTP v1. Both require explicit
device opt-in in Profile or Notifications. In-app and email preferences continue
to work independently. Email needs SMTP credentials; AI tutor needs a server-side
OpenAI key. Nothing is sent by an unconfigured provider.

```powershell
go run ./apps/push-keys -out release-builds/push.env -subject mailto:admin@example.com
```

Copy those three values into the server environment and preserve the private key
across deploys. Browser push requires HTTPS, except local browser localhost testing;
plain LAN HTTP does not support browser push. Never rotate VAPID keys casually,
because existing subscriptions are tied to their public key.

For Android, register package `com.edunexus.mobile` in Firebase, enable Cloud
Messaging and download `google-services.json` to `android-app/`. Add a service
account private JSON file to `deploy/secrets/firebase.json` and set
`FIREBASE_SERVICE_ACCOUNT_FILE=/run/secrets/firebase.json` on the API. Restrict that
file to the server user. Rebuild the APK with the matching Firebase client config.
The worker retries delivery and retires expired registrations. Data-only Android
push checks the currently bound account before displaying content. Logging out
unbinds the device. Notification taps open the relevant class or conversation.

## Signed releases and update notice

Use the **Build Android app** GitHub Actions workflow. Debug builds need only the
workspace URL. Production builds require HTTPS and repository secrets:

- `ANDROID_KEYSTORE_BASE64`: base64 of your permanent release keystore.
- `ANDROID_STOREPASS`, `ANDROID_KEYPASS`, `ANDROID_KEY_ALIAS`.
- `FIREBASE_ANDROID_JSON_BASE64`: matching Firebase Android client JSON, if enabled.

Keep an offline backup of the release keystore. All app updates must use the same
key and a higher version code. Change the version in Android Gradle, the manual
builder and `deploy/android-manifest.py` together. The workflow verifies signatures
and emits the APK plus SHA-256 manifest; it does not publish them automatically.

Publish the APK as `deploy/releases/downloads/EduNexus-release.apk` and its manifest
as `deploy/releases/android.json`. Set
`ANDROID_RELEASE_MANIFEST=/app/releases/android.json` and restart the API. Compatible
Android installations with the version bridge show a compact update notice. Download and installation
remain user actions. Only the fixed same-origin APK path is accepted.

## Backups and restore drills

For the existing local Docker database:

```powershell
.\deploy\BACKUP_DATABASE.ps1
.\deploy\VERIFY_RESTORE.ps1 -Backup F:\EduNexus\release-builds\database-backups\YOUR-BACKUP.dump
```

Restore verification creates a **new** `edunexus_restore_...` database, verifies its
schema and retains it for inspection. It never replaces the live database. Back
up the `uploads` Docker volume as well: database-only restores do not recover files.
For production, schedule `docker compose --env-file deploy/.env -f deploy/compose.yml run --rm backup`.
It creates database and upload archives plus checksums in `deploy/backups`.
Put that directory on encrypted storage; copy backups off the server and
set retention according to your school's policy. Back up uploads during a
maintenance window when file writes are paused. Perform a restore drill before
each release. To promote a restored database, separately review the target name,
change the API connection environment and restart; no automatic live overwrite.

References: [Firebase Android setup](https://firebase.google.com/docs/android/setup),
[FCM HTTP v1](https://firebase.google.com/docs/cloud-messaging/send/v1-api),
[Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).

## Audio/video calls

Android testing builds are now **1.3.1 / version code 5**. Apply migrations through
36 before starting the updated API. See [calling setup](../CALLING_AND_RICH_MESSAGES.md)
for HTTPS capture, the optional TURN relay, native permission behavior and testing
limits. Keep the web and Android Firebase projects aligned for incoming-call push.

### Temporary phone HTTPS testing

A LAN `http://192.168...` or `http://10...` address cannot capture phone media.
For a short test, Cloudflare Quick Tunnel can supply a valid HTTPS origin without
a hosting account. It exposes the normal login page; academic API authorization
remains required. Quick URLs change after restart and can expire after connection
loss. Keep the laptop, Docker, frontend, API, gateway and tunnel running.

Use an isolated production frontend (for example `.next-buildcheck` on loopback
port 3010), not a public Next development server. Build and run `apps/mobile-preview`
on loopback 3011, then point `cloudflared tunnel --url http://127.0.0.1:3011` at it.
Pass its generated HTTPS origin to the gateway's `-public-url` flag. The gateway
routes `/api/*` and `/messaging/socket` to the API and serves the frontend otherwise.
It returns the public `wss:` address in realtime tickets; tickets, bearer tokens and
backend origin checks remain required. Add the **exact** generated HTTPS origin to
the API's `REALTIME_ALLOWED_ORIGINS` environment before starting/restarting the API.
Do not add a wildcard origin, disable TLS validation or relax WebView security.

Build with `android-app/BUILD_ANDROID_FCM.ps1 -ServerUrl https://YOUR-TUNNEL-HOST`.
Android 1.3.1 moves saved HTTP test addresses to the build's HTTPS default on update.
If an old tunnel expires, the connection error screen's **Workspace address** button
allows entering the replacement HTTPS origin. Changing origins requires signing in
again. A quick tunnel is not a TURN media relay; restrictive or different networks
can still need the TURN configuration above. No physical-phone call is claimed
verified by an HTTPS/API/WebSocket smoke test.

Reference: [Cloudflare Quick Tunnel limitations](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/).
