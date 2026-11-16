# Classwork and onboarding

## Join links, QR and CSV invitations

The class owner opens **Class enrollment → Join settings** to copy a join link or download a QR image. Links prefill the class code; they do not enroll anyone automatically. Sign-in preserves the join destination and code. Existing approval, disabled-code and expiry checks run on the server. The QR uses the current frontend origin: a localhost URL is only usable on that device; open the shared/hosted app address before sharing across devices.

Teachers with people permission open **Class enrollment → Email invitations → Import student emails (CSV)**. Download the template or paste CSV with one `email` column, up to 100 rows and 32 KB. Preview identifies invalid addresses, duplicates, existing members and the ten-minute resend cooldown. Only ready rows are sent after explicit confirmation. A changed preview must be refreshed. A commit is atomic and shares the existing 100-per-teacher/day invitation limit; it never adds membership directly. Invitation acceptance, verified recipient binding, seven-day expiry and SMTP configuration follow the [enrollment guide](class-enrollment.md).

## Student progress and rubrics

Open **⋮ → Student progress** inside a class, or **Progress** in the workspace. Teachers can search the roster, filter support indicators and open a student. The roster uses pages of 50; existing report selectors retain their complete roster behavior. Students can access only their own records.

The detail view combines attendance and score history with published assignment status, missing work, latest submission feedback and criterion scores. Coursework is paginated, missing work first, and links to the existing assignment view. Draft and scheduled assignments are excluded. Existing exam-result publication restrictions still apply.

Assignment criteria can include an explanation of up to 1,000 bytes. Students see these criteria before submission and the awarded breakdown after grading. The server computes totals from valid criterion scores, rather than trusting the submitted total. Saved rubric templates preserve explanations. Existing rubric totals, immutable submitted-assignment rules and grade-change history remain in force.

## Scheduled content

- Announcements: **Stream → Announcement drafts** retains its draft/scheduled publishing workflow.
- Assignments: choose an optional publish time when saving a draft. It must precede the deadline and be within one year.
- Materials: choose an optional publish time during upload. Without it, the existing immediate-publication behavior applies.

Teachers with coursework permission open **⋮ → Scheduled content** to reschedule, cancel or publish an assignment/material now. Version checks reject stale actions. Cancelling retains a hidden material or assignment draft; it can be rescheduled or published later. A scheduled material is absent from student lists, stream, search and downloads until publication. Teachers can preview/download it and use existing material deletion.

Publishing requires the API process to be running. The worker checks approximately every 15 seconds and processes up to 20 items per tick, in addition to announcement drafts. Times are entered in the device timezone and stored as UTC instants. A missed time is processed when the server returns. Removed/inactive teachers, archived classes and revoked coursework permission block publication for review. Transactional resource-before-schedule locking prevents duplicate posts and coordinates manual publication, edits and cancellation.

## Class search and mobile layout

The search icon in the class header opens workspace search scoped to that class. Query/type/page changes retain the class filter. Active membership, published visibility and co-teacher coursework permissions are checked on the server. Search does not include private messages, exam answers or student submission contents.

New forms use visible labels, loading skeletons, explicit confirmation and accessible status/error messages. CSV upload, previews, feedback and schedule controls fit narrow screens and support Bengali/dark mode. Tests include 320/390/768/1440 px, Bengali at 20 px and independent QR decoding.

## Deployment and verification

Back up PostgreSQL and apply migration **51** (`scripts/database/apply-learning-features.ps1`) before running the new API. It adds schedules and indexes without changing existing publication status, memberships or grades. Native APK code is unchanged; a web-connected APK uses the frontend served at its configured address.

Verification covers fresh migrations 1–51, PostgreSQL integration/race tests, 501 students × 100 assignments, real HTTP API CSV/marking/search flows, a real background-worker material release/download, frontend checks/builds and installed-Chrome component checks. The source-rendered Chrome checks mock routing/data providers; they are not a full Next end-to-end test. Automatic approval review rejected QA frontend start as `blocked by policy`, so the current task did not run a new live Next frontend. No external invitation email was sent.
