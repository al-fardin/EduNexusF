# Semesters and academic reviews

## Semester workspace

Open **Semesters** from the workspace navigation. Create a dated semester, then use a class's **Manage** action to assign it, edit its syllabus, or archive/restore it. Only the class owner can change these settings. Archiving is blocked while an unexpired exam attempt is in progress.

Archived classes remain in the semester workspace for their existing members. Their syllabus and visible resource catalogue are readable there; restore the class to use its full classroom again. Archiving does not delete grades or coursework.

**Copy to next semester** creates a separate class with the owner as its only member. Selected assignments/exams become drafts with shifted dates. Topics, syllabus, selected visible materials, accessible text and attached question testers are copied. Students, submissions, attempts, marks, messages and announcements are excluded. Material files are independent copies (at most 50 files/100 MB); tester copies are limited to 50 MB. Missing source files abort the entire copy. Retrying an unchanged request returns the same new class.

## Question analysis

Teachers can open **Question analysis** in classroom Analytics. Only completed attempts contribute. MCQ options show response counts and the correct choice; theory/coding results use saved marks, with ungraded responses excluded and blank answers scored zero. Topic percentages weight graded question points. Small cohorts are explicitly marked. Students cannot access this endpoint or its answer keys. Reports are bounded to 5,000 completed attempts and 20 MB of answer data.

## Assignment similarity

Teachers choose an assignment and 2–100 students in **Similarity review**. The tool compares their latest text answers side by side using normalized five-word fragments, excluding fragments in the prompt. Answers shorter than 20 words are excluded. It shows pairs with at least 15% fragment overlap, up to 50 pairs.

This is a review aid, not a plagiarism verdict. Attachments are not scanned. Teachers can record a note for the exact pair of submission versions; no mark changes automatically. A newer submission requires a fresh review.

## Recheck requests

Open **Recheck requests** from classroom options. A student may request review of a graded assignment or a completed exam whose result has been published. The request freezes the current grade/feedback snapshot. Repeating the same request returns its existing receipt; a later changed grade may be reviewed separately. Limits are three open requests per class/student and ten rounds per resource.

Teachers can mark a request reviewing, resolved or rejected with a reason. Students can withdraw their own open request. Each transition records its actor, time and reason; stale concurrent changes are rejected. Students see only their own requests. Actual marks are changed through the existing grading tools. In-app notifications link directly to the review panel; email delivery depends on configured SMTP.

## Accessible materials

Material cards expose **Text & accessibility**. Teachers supply image alt text, a caption, searchable plain text, transcript and WebVTT captions. This does not perform OCR or automatic transcription. Students can search within the supplied text; global material search includes it. Supported uploaded audio/video files retain the existing 15 MB upload limit. Caption timing lines must have valid timestamps with the end after the start.

Previously opened accessible text can be read from the account-scoped offline cache. Open the material first while online. Offline exam rules are unchanged. Conflicting teacher edits require a reload rather than silently overwriting another edit.

## Database deployment

Back up PostgreSQL before running `scripts/database/apply-learning-features.ps1` from the repository root. Migrations 43–45 add semesters, review history and material accessibility. The script applies migrations through 45. Restore a matching database backup and material storage together when recovering a workspace.
