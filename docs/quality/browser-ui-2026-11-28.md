# Browser exams and animated interface - 2026-11-28

## Changes

- Public guest home: black/purple orbital landing page with EduNexus content,
  working navigation, pause control and reduced-motion support.
- Login, registration and workspace authentication share the orbital loading
  scene. The animation reflects actual pending authentication, not a simulated
  progress percentage. Login failures return to the form; successful registration
  retains its existing account-created/email-verification workflow.
- Shared light/dark tokens, navigation, forms and surfaces follow the purple
  identity. Dark is the default for new installs; saved preferences are respected.
  Workspace motion is subtle. Class cards have custom covers, monograms and a
  contextual menu; the full card remains a navigation link.
- Native desktop client source, build workflow, shipped executables, pairing,
  telemetry, teacher desktop report and native tester upload/ticket/download
  implementations are removed. Legacy database records and question metadata are
  retained for compatibility, without native execution or student tester exposure.
- Initial browser consent is enforced server-side. A previous response-writing
  helper returned nil after rejection, allowing Start to continue; the prerequisite
  now returns an actual error. Consented active attempts can resume beyond the
  initial 15-minute entry window. Closed, expired and unrelated attempts cannot.
- Account-scoped session keys and server admission recovery avoid repeat consent
  after back/reload or lost session storage. No attempt time is extended.
- Extension 1.4.0 supports localhost on all ports and explicit permission for a
  selected hosted/LAN site. The bridge additionally checks the exact origin.
  Windows/Linux setup instructions and foreground rechecks reduce manual steps.

Existing interface refinements in the working tree were retained and checked with
these changes. The approved logo is unchanged. Historical source maps/PDFs remain
labelled with their earlier source snapshots; the current workflow is documented
in [browser-only exams](../guides/browser-only-exams.md).

## Verification

- `npm run check`: lint, TypeScript and 101 regression tests passed.
- `npm run build`: all 31 generated static pages and dynamic routes built.
- Go packages tested against the explicitly isolated `edunexus_features`
  PostgreSQL database; the changed exam package was rerun after native-code removal.
- `go vet ./internal/... ./apps/...` passed.
- Database regression: first entry without consent rejected; entry with consent
  succeeds without a native client; 50-minute-old consent resumes the same active
  attempt; another student, a closed exam and an expired attempt are rejected.
- Retired native metadata and answer keys are omitted from public questions.
- 35 browser checks passed against the real API and isolated database: landing
  at 320/390/768/1440 widths, animation/pause/reduced motion, auth layouts, light/dark
  workspace/class list/calendar/settings, class click/menu and exam recovery.
- Real sign-in displayed the animated pending state and reached the dashboard.
  A separate real registration check verified its animation and success screen.
  Invalid credentials restore the form and enable retry; reduced motion disables the ring.
- Exam browser checks covered Windows and Linux user agents: initial consent,
  back/resume, aged consent, reload and missing session storage, without native
  requests or a second agreement. Retired routes and downloads returned 404.
- Extension tests cover scoped host permission, exact-origin isolation and rejected
  foreign-origin replies. The downloadable ZIP matches all extension 1.4.0 sources.
- Deployment isolation checks passed. No application data migrations were added.

A final additional rapid back/resume race check could not complete because the
development server repeatedly reloaded during navigation. The monitor cleanup now
checks component ownership before stopping a session; the final source passed
the frontend checks and production build. That additional browser race check is
not included in the 35 passing checks above.

Browser checks used the running local development server; the production bundle
was built separately. The extension transport was simulated in those checks.
This is not native Linux OS testing, Chrome Web Store installation verification or
a claim that browser monitoring detects operating-system processes. Physical
Android, calls and external email/push delivery were not part of this UI change.

## Design reference

[Augustus - Project Management dark/night landing](https://dribbble.com/shots/25526636-Project-Management-Dark-night-mode-web3-landing-animation).
The still and palette informed the composition; SVG/CSS recreate the moving ring
and background. Exact original-video timing was not available to compare.
