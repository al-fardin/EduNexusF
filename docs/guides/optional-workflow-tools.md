# Optional classroom workflow tools

These tools extend existing sections, schedules, calendar, search and archives. Everyone remains the default audience. Teachers do not need sections, personal deadlines or scheduling to create ordinary content.

## Audience and sections

Content **Advanced settings → Audience** now shows paginated **Selected students** and **Excluded students**, with names, rolls and counts. The same section/roll predicate controls access on the server. Previewing is read-only; it neither publishes content nor changes memberships.

**Classroom ⋯ → Advanced class settings → Bulk section transfer** lets teachers select up to 200 enrolled students, choose a section (or Unassigned), provide a reason and confirm. Each roster version is rechecked in one transaction. A stale selection rolls back the entire transfer. Roll numbers and historical work stay unchanged. Transfers record before/after section names in the teacher activity history. CSV roster reconciliation remains available separately.

## Publishing and personal timing

**Classroom ⋯ → Scheduled content → Schedule a draft exam** adds a publication schedule to an existing draft. Publish time must be in the future, within one year and before the exam starts. Existing assignment/material schedules and announcement drafts continue to work. Teachers can cancel, reschedule or publish now using version checks. Manual exam publication completes its pending schedule. The API's existing scheduler rechecks classroom/teacher permissions; a missed exam schedule after its start is blocked for teacher review rather than opening unexpectedly. The API must be running for schedules to execute.

**Advanced class settings → Personal timing** supports:

- Exam extra minutes for a specific roll, configured before the exam starts and before that student's attempt. Total allowed duration is at most 240 minutes. The exam's original closing time remains a hard limit. Mobile and desktop starts apply the same personal duration. This does not reopen completed attempts or bypass audience, device or admission rules.
- An assignment deadline extending the class deadline by at most 30 days. Leaving the personal deadline blank restores the class deadline; zero extra minutes restores normal exam duration. Changes require a reason and a current version.

The server applies personal assignment deadlines to submission acceptance, lateness, progress, classwork, calendar reminders, task inbox and the home overview. Other students keep the class deadline. Personal timing changes appear in activity history.

## Planner and search

**Student planner** shows upcoming exams, assignments and class events for the next 7 or 30 days, with a class filter and links to the existing Task inbox and Calendar. Personal assignment deadlines are included. Still-open exams are included even when they started before the planning window. Calendar reminders retain their existing controls.

The existing classroom search icon searches materials, announcements, assignments and exams within that class. It respects membership, publishing state and audience visibility; private answers and messages are not searched. Existing archive/unarchive actions remain available from class cards and semester tools.

## Trash and restore

The workspace **Trash** lists classes deleted by their owner within the last 30 days. Only the owner can restore them. Restored classes are archived first; unarchive deliberately to make them active again.

**Advanced class settings → Class trash** lists deleted announcements and materials within the last 30 days. Restoration requires confirmation, a reason and the exact deleted version. Prior audiences and material stream links are preserved. Cancelled publication schedules are not automatically resumed. Students cannot list or restore class trash.

Material deletion now retains the private file and hides it from students and teachers until restoration. Previously destroyed files from older releases cannot be recovered. The 30-day limit governs restoration; this release does not introduce automatic physical purging. Retained files continue to count against storage quota. Keep material storage and PostgreSQL backups together.

## Migration and verification

Back up PostgreSQL, then apply migration **54** using `scripts/database/apply-learning-features.ps1` before starting the new API. It adds personal timing, material trash and optional exam publication schedules. SQLC models are regenerated. Migration rollback refuses to proceed while materials remain in trash, preventing accidental exposure under the previous visibility function. Rolling back removes personal timing and exam schedules; take a matching database/storage backup first.

Verification covers atomic/stale bulk transfers, excluded audience previews, timing permissions and versions, extended submission/calendar deadlines, real mobile attempt expiry and hard close, exam publication (scheduled and manual), restore ownership/window/version checks, retained material files, audience preservation and co-teacher capabilities. Existing-data checks use authenticated, read-only connections. No external email, push or AI calls are sent by these checks.

Frontend checks include lint, TypeScript, component tests and production build. Installed Chrome source-rendered checks cover 320/390/768/1440 px, Bengali text, dark mode and 20 px text. Routing and data providers are mocked in those layout checks. Automatic approval review rejected the live QA frontend start as `blocked by policy`, without a specific reason; these checks do not replace a full live Next.js end-to-end run.
