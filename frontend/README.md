# EduNexus Frontend

Next.js, React and TypeScript interface with a violet light/dark theme, responsive sidebar, mobile navigation and class-scoped messaging.

## Screens

- `/` — home workspace with class cards, recent activity and upcoming coursework.
- `/classrooms`, `/instructor/classrooms`, `/student/classrooms` — all, teaching and learning classes.
- `/messages` — private teacher–student conversations grouped by class; optional `class` and `thread` URL parameters retain the selected conversation.
- `/calendar`, `/files`, `/notifications` — published deadlines, shared material downloads and account notifications.
- `/settings` — profile, verification, notification preferences and appearance.
- Authentication and classroom routes retain their existing account, coursework and exam workflows. Classroom sections persist in the `tab` URL parameter.

See [theme and messaging rollout](../VIOLET_MESSAGING.md). The old `/preview` route is a sample-data design archive; use the authenticated app to inspect the current interface.

## Quick start

Requirements: Node.js 20.9+ and npm. Use an operating system with compatible Next.js native dependencies (run `npm ci` on your own OS).

```bash
cd frontend
npm ci
# Optional: set BACKEND_API_URL in frontend/.env.local
# Default server assumed in the existing API proxy: http://localhost:8080
npm run dev
```

Visit `http://localhost:3000/preview` to inspect styling without database or API setup. For real sign-in/classroom functionality, start the Go API and PostgreSQL using the project's original instructions/configuration.

**Important current-backend limitation:** Existing Go API still includes account-level instructor permissions for some teaching endpoints. The proposed **one account = both student and teacher, depending on classroom membership** permission redesign is a future backend task. This frontend makes both experiences discoverable without claiming the backend has been migrated.

## Design notes

- Warm beige `#e8e1d2`; ivory `#f5f1e6`; deep brown `#5b4030`; ink `#2a2520`.
- Organic rounded edges, ticket-like actions, understated paper detail; responsive top navigation.
- Classroom-first dashboard, accessible empty states and route-specific UI.
- No unrelated analytics graphs, financial charts, or irrelevant content from the reference template.
- Future live exams, coding execution, AI grading, cheating-risk reports and public/private results **not yet implemented**.

## Verification

- TypeScript type checking: `npx tsc --noEmit` — passed in preparation environment.
- Standalone visual preview: Chrome desktop and mobile rendering checked; clickable preview tabs and mobile width checked.
- Full `next build`: **not verified**. The source ZIP was created on Windows and shipped only Windows SWC native dependencies; the isolated Linux inspection environment cannot download the Linux build binary. `npm ci` on your own machine installs native packages for the matching platform.

No `.env` secrets, real authentication tokens, `node_modules`, `.next` cache, or `.git` history are bundled into the delivery ZIP.
