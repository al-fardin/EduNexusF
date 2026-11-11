# EduNexus

Classroom, coursework and exam platform with a Go API, PostgreSQL, Next.js frontend, Windows exam client and Android WebView app.

## Project structure

```text
backend/         Go API, services, tests, generated API docs and sqlc config
frontend/        Next.js, React and TypeScript interface
database/        SQL migrations and queries
android-app/     Android application and build tools
desktop-client/  Windows exam client and build tools
chrome-extension/ Browser extension
scripts/         Local development and database administration
deploy/          Docker images, Compose and hosting configuration
docs/            Guides, verification notes and design previews
archive/         Historical snapshots and unused scaffolding
release-builds/   Local binaries, build tools and logs (ignored)
uploads/         Private uploaded files (ignored)
```

## Run locally

Run from the repository root in PowerShell:

```powershell
docker compose up -d
.\scripts\dev\start-local.ps1
```

The launcher checks frontend assets and API health, then prints the phone URL and
APK download link. Its existing `-WebPort`, `-ApiPort` and `-Production` options
remain available. See [scripts](scripts/README.md) for database commands.

To run each service manually, use two terminals:

```powershell
# Terminal 1: repository root; keeps .env and uploads at their existing paths.
go run ./backend/apps/api

# Terminal 2
cd frontend
npm run dev
```

The root `go.work` selects the Go module in `backend/`. Application settings and
private uploads remain at the repository root. See [backend setup](backend/README.md),
[frontend setup](frontend/README.md) and the [documentation index](docs/README.md).

The home workspace uses actual class memberships, recent stream posts and upcoming published coursework. Teaching and Learning remain available to the same account. Theme preferences persist on each device.

## Desktop client and optional question testers

EduNexus Desktop 1.5 adds a refreshed interface and optional Windows `.exe` testers on coding questions. See [Desktop setup](desktop-client/README_CLIENT.md) and the [tester protocol](desktop-client/TESTER_PROTOCOL.md). Apply migration `000022_question_testers` before using attachments.

## Learning features rollout

See [learning features](docs/guides/learning-features.md) for deployment migrations,
SMTP and OpenAI tutor configuration, and [saved work and teacher history](docs/guides/learning-workflows.md)
for the recent coursework workflows.
