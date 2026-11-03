# EduNexus

Classroom, coursework and exam platform with a Go API, PostgreSQL, Next.js frontend, Windows exam client and Android WebView app.

## Run locally

Start Docker, then run `./START_LOCAL_MOBILE.ps1` in PowerShell. The launcher checks the frontend assets and API health, and prints the current phone URL and APK download link. See [frontend setup](frontend/README.md), [learning features](LEARNING_FEATURES.md) and [violet theme and messaging](VIOLET_MESSAGING.md).

The home workspace uses actual class memberships, recent stream posts and upcoming published coursework. Teaching and Learning remain available to the same account. Theme preferences persist on each device.

## Desktop client and optional question testers

EduNexus Desktop 1.5 adds a refreshed interface and optional Windows `.exe` testers on coding questions. See [Desktop setup](desktop-client/README_CLIENT.md) and the [tester protocol](desktop-client/TESTER_PROTOCOL.md). Apply migration `000022_question_testers` before using attachments.

## Learning features rollout

See [LEARNING_FEATURES.md](LEARNING_FEATURES.md) for the six learning modules, deployment migrations, SMTP setup and OpenAI tutor configuration.
