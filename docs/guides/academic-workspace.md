# Academic workspace

Migration 42 adds class calendar events, personal reminders, attendance and bulk
operation receipts. Back up existing databases before applying it with
`scripts/database/apply-learning-features.ps1`. New installations require the full
migration chain. Existing grades, attempts, messages and uploads retain their
current storage and permissions.

## Calendar

Open Calendar from the sidebar or Home tools. Exams, assignment deadlines and
teacher-created events share a month view and an accessible agenda. Filter by
class and type. The API permits date ranges up to 93 days and explicitly reports
when a range exceeds its 500-item display limit. Narrow the range rather than
assuming every event is present.

Teachers can create and remove class events. Event duration is at most seven
days, with up to 1,000 stored events per class. Students cannot edit events.
Everyone chooses their own reminder: 15 minutes, one hour or one day before the
item. One notification per person/item is generated; changing a reminder does
not create a second delivery after it has been sent. Deleted, closed or
unpublished resources and removed memberships are excluded. The API worker must
remain running and checks reminders every 30 seconds; overdue items do not send
late reminders. Existing app/email preferences and digest delivery still apply.

## Teacher bulk tools

Open **Gradebook → Bulk tools**, then select an assignment.

- Download the latest submission versions as ZIP: at most 500 submissions and
  50 MB of uncompressed answers/files. Files have safe archive paths and remain
  private. This endpoint is teacher-only.
- Download the CSV template. Its editable fields are `submission_id`, `version`,
  `points`, `feedback` and `criteria`. The trailing student name, roll and ID are
  identification aids; editing them never redirects a grade to another person.
  The server generates the latest version of every active student's submission,
  independently of the normal submission history's pagination.
- Rubric templates include every criterion ID with its current score, or zero
  when ungraded. The rubric legend explains each ID. Edit the `criteria` JSON
  scores; the server derives the total and validates criterion maxima.
- Upload up to 500 CSV rows / 1 MB. Preview lists recipients, old/new scores and
  new feedback. Confirmation is transactional. Stale versions, membership changes
  and grades changed after preview reject the entire batch. Request receipts make
  lost-response retries idempotent. Spreadsheet formula prefixes are escaped in
  exported text; review feedback in the preview before confirming.
- Select up to 200 students without a submission and confirm a reminder. The
  server rechecks active enrollment and submission state. Repeated clicks are
  deduplicated per assignment, student and UTC day. Email requires configured
  SMTP and follows the student's existing delivery preference.

## Progress and attendance

Progress is available from Home, the sidebar and class Analytics. Students see
only their own active-class data. Teacher views include roster search, a support
filter and individual score history. Student exam history includes published,
fully graded results only. Teachers can also inspect unpublished completed
scores. Assignment progress uses the latest submission version; zero remains a
score, while ungraded work is excluded from averages. Averages weight coursework
percentages equally, rather than weighting by maximum points.

Missing work counts published assignments past their deadline with no submission,
and ended exams with no attempt. Support indicators are missing work, an average
below 50%, or recorded attendance below 75%. These fixed indicators prompt review;
they are not predictions or final academic judgements.

Teachers can record date-wise present, absent or excused status for up to 500
active students. Unrecorded dates do not count as absences. Excused dates are
excluded from the attendance-rate denominator. Student views cannot change
attendance. Dates are validated against the current day in Asia/Dhaka.

## Global search

Search covers active classes, stream posts, visible materials, assignments and
exam titles. Student results exclude draft coursework; teachers may find drafts
inside classes they teach. It does not search exam answer keys, private messages
or student answers. Literal `%` and `_` are supported. Results are paginated in
pages of 50, with class-aware links that retain the assignment selection on refresh.

## Language and accessibility

Profile → Language and accessibility offers English / বাংলা and three text sizes.
Preferences persist on that device and synchronize between its browser tabs.
Navigation, core auth/classroom labels, standard actions and the new academic
views use the shared dictionary. Classroom content is preserved verbatim; legacy
copy and server messages without dictionary entries retain their English fallback.

Keyboard users can skip directly to main content. Controls have visible focus,
named inputs, touch targets and text indicators alongside charts. The app respects
reduced-motion preferences and retains browser zoom. Headless viewport tests do
not certify physical Android keyboards or a complete screen-reader audit.

Operational setup and verification are in the
[release operations guide](../quality/academic-release-operations.md).
