# EduNexus

Classroom, coursework and exam platform with a Go API, PostgreSQL, Next.js frontend, browser exam monitoring and Android WebView app.

## Project structure

```text
backend/         Go API, services, tests, generated API docs and sqlc config
frontend/        Next.js, React and TypeScript interface
database/        SQL migrations and queries
android-app/     Android application and build tools
chrome-extension/ Browser-only exam monitoring for Windows and Linux
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
.\scripts\dev\start-local.ps1
```

The launcher starts Docker services, builds the API, starts Next.js and verifies
database readiness, the login page, frontend assets and the API proxy. Defaults:
web `3000`, API `8080`. Docker Desktop must be running; Go and Node.js must be
installed. Missing frontend dependencies are installed from the lockfile.

```powershell
.\scripts\dev\start-local.ps1 -Action Status
.\scripts\dev\start-local.ps1 -Restart
.\scripts\dev\start-local.ps1 -Action Stop
```

Logs and process state live under `release-builds/local-server/`. Re-running the
command reuses its verified running processes. A conflicting port shows the
owner when Windows exposes it. Stop/restart controls only launcher-managed app
processes and their children; Docker data services keep running.

A new empty PostgreSQL volume initializes the complete schema automatically.
Existing databases and `.env` settings are preserved; existing-database upgrades
still use the explicit backup/migration tools. `-Production`, `-WebPort`,
`-ApiPort` and `-SkipInfrastructure` are available. See [scripts](scripts/README.md).

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

Exams use the EduNexus browser extension in Chrome or Edge on Windows and Linux. No native desktop client or Windows executable tester is required or distributed. See [browser exam setup](docs/guides/browser-only-exams.md).

## Learning features rollout

See [learning features](docs/guides/learning-features.md) for deployment migrations,
SMTP and OpenAI tutor configuration, and [saved work and teacher history](docs/guides/learning-workflows.md)
for the recent coursework workflows.
The [coursework workflow guide](docs/guides/coursework-workflows.md) covers the
combined classwork catalogue, gradebook, rubrics, scheduled posts, notification
digests and shared message files.
See [academic workspace](docs/guides/academic-workspace.md) for calendar reminders,
bulk grading, progress/attendance, global search and language/accessibility
preferences, and [release operations](docs/quality/academic-release-operations.md)
for automated backup verification, diagnostics and bounded load checks.
