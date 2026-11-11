# Messaging, saved work and teacher history

## Messaging

Conversation settings offer message notification mute for 1, 8 or 24 hours, or
until enabled again. This preference belongs to the current account. Messages
remain in the inbox and calls still ring. Delivery rechecks mute before sending
a background notification.

Each conversation can share up to five pinned messages. Removing a message
removes its pin. Classroom messaging restrictions also apply to adding pins.
An unread divider uses the read position at the start of the conversation view;
the existing jump control returns to the latest messages. A failed send retains
its attachment and request ID for an explicit retry.

## Saved work

Open **Saved work** from the sidebar or the offline connection banner.
Previously opened/downloaded classroom materials are available there. Assignment
drafts save on the device and can be reopened and edited from this page.
Selecting **Submit assignment** explicitly queues a draft; merely typing never
submits it. Keep the app open after reconnecting so queued work can sync.

The server verifies identity, classroom access, publication, deadline and
submission version before accepting an upload. A confirmed submission removes
the queued draft. Network failures retain it with backoff. Rule/version conflicts
retain the draft with a review message. Open the assignment online to check the
current submission version before resubmitting a conflict.

IndexedDB records are scoped to the signed-in account. Logout/account changes
clear the previous account's saved work. Leaving a class or receiving a permission
denial clears that class's saved records. Offline identity is limited to a
previously server-verified active profile, an unexpired access token and a
verification less than 24 hours old; it never authorizes a server write.
Temporary refresh outages retain the session/drafts; rejected refresh credentials
clear the session. Late refresh responses cannot change another login.

An upload lease and local revision checks coordinate tabs. Submission retries use
the same server request ID. Uploads use the original account's captured token;
another login cannot replace it through a mutable API interceptor.

Files are limited to 15 MB, saved records to 100 MB per account. Cached materials
expire after seven days; automatic eviction keeps unsent drafts. Browser storage
can still be cleared by the browser/device or by the user. The worker caches only
the generic offline page and public build/PDF rendering assets. Exam/auth API
responses and exam submission queues are excluded. Existing exam recovery rules
remain separate. Offline navigation requires HTTPS or localhost and an installed
service worker; cleartext LAN browser origins cannot register one.

## Teacher activity

Teachers can open **History** inside a class. The log records assignment/exam
grade changes, assignment deadlines, exam schedule/early closure, and material
deletions, including actor name, time, reason and before/after values. It starts
with migration 38; it does not reconstruct older changes. Automatic MCQ grading
is not attributed to a teacher. Student answers and file contents are excluded.
There are no edit/delete endpoints for individual history entries. Deleting the
class removes its history along with other class records.

Assignment deadlines have a dedicated action that remains usable after
submissions arrive. It checks the expected deadline to reject simultaneous stale
edits. Normal assignment content and exam question/schedule editing locks still
apply. Audit entries are created in the same database transaction as changes,
so rollbacks and no-op grade retries do not leave misleading entries.

## Verification on 2026-11-07

- Frontend lint (zero warnings), TypeScript, 27 Node tests and isolated production build.
- PostgreSQL integration tests for private mute, shared pin limits/deletion,
  unread cursors, delivery-time mute with calls unaffected, audit permissions,
  no-op/rollback behavior, deadline conflicts, material deletion and exam grades.
- IndexedDB tests for account isolation, draft conflicts, exclusive upload claims,
  lease recovery, blocked/retry state and quota eviction retaining drafts.
- Boundary tests exclude exam/submission/auth file APIs from offline caching;
  refresh tests cover temporary outages and account switches.
- Full Go suite, real database read-only routes, vet and Linux race checks using
  the already cached Go image. Fresh migrations 1–38 completed successfully.
- Live database backup created before applying migrations 37–38.

The user's phone call test was reported successful. On 2026-11-11 the user started
the isolated QA frontend after server-start policy rejection. Authorized headless
Chrome checks then passed for mobile classroom refresh/back navigation, draft and
attachment restoration, cold offline Saved work, offline editing and queuing,
single submission after reconnect, and cached material previews. A reduced
viewport with form focus was checked; this does not replace physical Android
keyboard testing. See the [new workflow guide](coursework-workflows.md).
