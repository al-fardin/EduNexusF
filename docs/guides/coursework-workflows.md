# Coursework and communication workflows

Apply migrations 39–41 after backing up the database. Existing installations can
use `scripts/database/apply-learning-features.ps1`; new databases require the full
migration chain. Run the API from the repository root to retain the existing
`.env` and private upload paths.

## Classwork

Classwork opens with a combined assignment, material and exam catalogue. Search,
type, topic and sorting filters work together; group results by topic or week.
Results load in pages of 50. Student results exclude unpublished assignments and
exams. Existing assignment and exam pages remain available.

Teachers can duplicate assignments and exams into drafts. Copies get independent
question identifiers and contain no student submissions. Material duplication
uses the existing protected download/upload flow and confirms publication first.

## Gradebook and grading

The teacher-only Gradebook displays published coursework against enrolled
students. Search by name or roll, filter status and export the filtered rows to
CSV. Export includes all matching students, not just the visible table page;
spreadsheet formula prefixes are escaped. Missing work, work in progress,
ungraded submissions and a score of zero remain distinct. Assignment scores use
the latest submission version. Unpublished exam results remain teacher-only.

Gradebook limits are explicit: at most 200 coursework columns and 5,000 active
students. Larger classes receive an error rather than silently truncated grades.

Assignment rubrics contain up to 20 criteria, with a total matching the assignment
maximum. The server validates every criterion and derives the final score from
the rubric. Teachers preview a grade before confirming it. Exam result
publication also has a confirmation preview.

Reusable rubrics and feedback are scoped to their class. Gradebook opens their
management dialog. Removing a library template does not change criteria already
copied into an assignment. Students can see their own criterion scores.

## Announcements

The stream composer provides saved drafts and scheduled announcements. A draft
can be edited, scheduled, cancelled or explicitly published now. Concurrent stale
edits are rejected using a version check. Scheduling requires the API to remain
running; its worker checks due work every 15 seconds and rechecks teacher access
before publishing. Removed access blocks the job. Publishing and its job status
are saved in one transaction to prevent duplicate stream posts.

## Notifications

Filter notifications by class, event type and unread status. Related updates can
be grouped by class, type, destination and day, and marked read together. The
navigation badge still counts individual unread notifications.

Email preferences offer immediate, daily or weekly delivery. Daily and weekly
intervals are measured from the preference period, not a fixed local clock time.
SMTP must be configured and the API worker must remain running. Digest jobs are
durable, retry failed delivery and recheck membership and preferences before
sending. They collect up to 500 notifications, with up to 100 detailed entries
and a count for the remainder. SMTP delivery is at least once: a crash after a
mail server accepts an email but before the database acknowledgement may cause a
retry. These checks use mock mail delivery; they do not send external email.

## Messaging

Search the inbox by person or recent message and optionally show only unread
conversations. Conversation settings open a searchable shared media/files
library. Files use the existing protected preview and download paths. Deleted
messages and conversations outside the current class are excluded. Call history
can be filtered to missed calls. Existing calling and composer behavior remains
in place.

## Saved work

Saved work shows account storage, draft counts, pending submissions and items
requiring review. Network retries retain the original submission identifier;
manual retry clears network backoff without bypassing a blocked submission or
another tab's active lease. The app needs to be open and online for browser sync.
Exam attempts continue to use their separate recovery rules.

Offline access requires HTTPS or localhost, a previously verified session and an
installed service worker. Private drafts, files and queues remain account-scoped.
Clearing site storage or choosing Clear saved data removes those local copies.

## Verification on 2026-11-11

- Frontend lint without warnings, TypeScript, 29 Node tests and production build.
- Full Go tests and vet; Linux race tests against a separate disposable database.
- Fresh migrations 1–41; live database backup before applying 39–41, followed by
  read-only route checks. UI writes used isolated fixture accounts and database.
- Headless installed Chrome: rubric authoring, grade preview before persistence,
  saved criterion totals, gradebook CSV download, scheduled post save/publication
  and student access rejection, mobile inbox search and shared attachment library.
- At 390×844, classroom refresh/back navigation and assignment draft/file recovery
  passed. After a cold offline reload, editing and queuing succeeded; reconnect
  produced exactly one submission with its original attachment. Cached image
  materials remained previewable offline. Form focus at a reduced 390×520 viewport
  and refresh preserved usable layout. Checked pages had no horizontal overflow
  or JavaScript page errors. An offline banner overlap was fixed and retested.

Browser automation uses isolated sessions, not personal Chrome profiles. Phone
calls were tested successfully by the user; background calling and physical
Android keyboard behavior are not implied by headless browser tests.
