# EduNexus – Vintage Frontend Review Package

This project contains the **redesigned frontend** plus the **unchanged Go backend source**, PostgreSQL queries/migrations, and Docker Compose configuration from the supplied EduNexus project.

- `FRONTEND_PREVIEW.html`: **open this directly in a browser** to view the UI without installing anything.
- `FRONTEND_PREVIEW.png` and `FRONTEND_PREVIEW_MOBILE.png`: desktop and mobile preview screenshots.
- `frontend/README.md`: full frontend setup steps, page list, design notes, and build caveats.
- `frontend/app/preview/page.tsx`: the design preview route within Next.js.

## Not included

- Real `.env` values, passwords, authentication tokens, machine-specific dependencies, build caches, Git metadata, debug logs.
- Future exam/AI/anti-cheating/backend roles implementation. This phase is **frontend redesign only**.

## Get started

Open `FRONTEND_PREVIEW.html` now. To run the actual integrated frontend, see `frontend/README.md`.

## Desktop client and optional question testers

EduNexus Desktop 1.5 adds a refreshed interface and optional Windows `.exe` testers on coding questions. See [Desktop setup](desktop-client/README_CLIENT.md) and the [tester protocol](desktop-client/TESTER_PROTOCOL.md). Apply migration `000022_question_testers` before using attachments.
