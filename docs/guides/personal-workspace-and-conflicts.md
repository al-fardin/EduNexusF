# Personal workspace and schedule conflict checks

## Personal workspace

Open **Personal workspace** from navigation. Students and teachers can create private notes containing text, checklists, HTTP/HTTPS links and attached files. Save explicitly; unsaved changes are indicated, with a warning before reload or following a link. Notes use server versions so simultaneous edits cannot silently overwrite each other. Offline editing/sync is not added to this feature.

Limits: 500 notes per account, 160 characters per title, 20 KB of note text, 100 checklist items and 20 links per note. Files support up to 10 MB each, 10 files per note and 50 MB across the account. Save note edits before changing attachments. Files are private authenticated downloads, served as attachments with `no-store` and `nosniff`, never executed or rendered inline by the API. Private files are stored in PostgreSQL, so include them in database backups.

**Personal note** shortcuts are available in the classroom menu, material/assignment/exam views and message actions. A shortcut opens a new note referencing that resource; it does not copy classroom files. Existing classroom visibility, publishing state, audience, co-teacher capabilities and conversation participation remain required. A linked message has a short current preview and opens its conversation. Deleted messages are not exposed through notes.

Leaving or deleting a class does not destroy a user's own notes. Inaccessible context links are hidden while the private note remains editable. Deleting a private note or private file requires confirmation and the current note version; these deletions are permanent and are not part of classroom Trash. Teacher permissions never grant access to another user's personal workspace. Responses are not cached offline.

## Schedule conflict checker

Optional **Schedule conflict check** panels appear when creating/editing exams and assignments, on teacher exam cards before publishing, and when changing assignment deadlines. Nothing is checked or required unless the teacher clicks **Check schedule**. A result becomes hidden when its dates/audience change. Creating, saving and publishing retain their existing rules and default Everyone audience.

The read-only check reports overlapping exam windows and assignment deadlines within 24 hours of the proposed window/deadline. Exact adjacent exam windows are not overlaps. Only active classes the actor teaches with coursework access are examined; other teachers' private classes, coursework and student identities are not disclosed. Published work and scheduled drafts are checked, excluding the item being edited. Results include shared enrolled student counts using section/roll targeting and retained participation access. With no shared students, an overlapping exam can still be a teacher timetable conflict.

The checker uses class schedule dates, not private personal deadline overrides. It cannot establish that every student's timetable is conflict-free across classes the teacher cannot access, or predict future enrollment changes. Results are advisory and capped at 100 with an explicit truncation flag; publishing is never blocked by a warning.

## Deployment and verification

Back up PostgreSQL, then apply migration **55** using `scripts/database/apply-learning-features.ps1` before starting the new API. SQLC models are regenerated. Rolling back migration 55 drops personal notes and private files, so restore/export the appropriate database backup before considering a downgrade.

Tests cover account isolation, owner-only files, version conflicts, attachment quota, safe downloads, linked context after membership removal, numeric message IDs/participant privacy/deletion, manual-only schedule checks, stale-result hiding, exact time boundaries, audience intersections and bounded conflict results. Existing authenticated routes are checked with read-only connections. Full backend race tests, frontend lint/TypeScript/component tests and production builds are run.

Installed Chrome source-rendered checks cover mobile/desktop sizes, Bengali, dark mode and enlarged text with mocked routing/data. The automatic approval review rejected the live QA frontend start as `blocked by policy` without a specific reason, so full live Next.js end-to-end verification remains outstanding. No external email, push or AI requests are sent by these tests.
