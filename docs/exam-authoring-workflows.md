# Exam authoring workflows

All new organization, set-generation and display controls are optional. Existing
untagged bank questions, standalone exams, default audiences, mobile permission
rules, timing, marking and answer recovery continue to work.

## Readiness

Expand Exam readiness while creating/editing an exam to see points and missing or
invalid question fields. Go to field focuses the affected control/question.
Check saved data & schedule combines server validation with the existing advisory
schedule-conflict check. Only classes the teacher can access are examined. Conflict
warnings do not change scheduling, audience or publication automatically.

Draft cards offer the saved check and a direct Open exam editor link. The link
retains the classroom Exam tab and selected editor on refresh. Publication validates
the stored questions, raster images, marking keys, duration/window and any attached
tester again under an exam row lock. Invalid/empty/ended drafts stay unpublished;
successful publication still completes an existing pending content schedule.

## Bank organization and usage

Subject and chapter are optional question metadata; topic and difficulty remain
compatible with existing bank records. Syllabus tags can be edited in the question
editor or bank. Filters cascade Subject → Chapter → Topic, with explicit search,
difficulty and 50-item pagination. Random draws respect the selected filters too.
No migration or relabeling of old records is required.

Where used lists up to 100 recent exams in the same classroom. New bank additions
record a stable bank ID/version in the teacher-owned exam snapshot. Older questions
without that metadata can show a clearly labeled same-text match. Source metadata
is excluded from student questions. Bank edits do not rewrite existing exams.
Cross-class semester copies clear source bank IDs while retaining question content,
tags and their independent tester copies.

## A / B / C sets

Generate two or three sets from a private saved draft:

- Shuffle mode keeps the same questions, shuffles MCQ choices with their marking
  keys/option images, and shuffles questions within contiguous sections. Small
  sections may share an order; the preview warns about this.
- Equivalent mode keeps Set A's questions and draws distinct bank questions for
  the other sets, matching type, points and all specified subject/chapter/topic/
  difficulty tags. At least one syllabus tag is required. An insufficient bank
  returns a precise error instead of silently replacing a question. Unspecified
  difficulty is disclosed in the preview. These tags support teacher review;
  matching them is not a claim that two questions have identical educational difficulty.

Every set keeps the question count, total marks, required flags, section positions,
schedule, duration, phone setting and audience. Each question receives a fresh ID.
Review every set and its keys, then explicitly approve the exact preview. Approval
creates all private drafts in one transaction. It never publishes or assigns them.
Choose sections/roll rules for each draft before publishing; the source draft stays
unchanged. Creating multiple drafts for the same audience does not automatically
allocate a different set to each student.

The server signs a ten-minute preview receipt with the existing server JWT secret,
bound to actor/class/source/questions. Changed snapshots and stale source/bank
changes require a new preview. Previously copied bank snapshots remain independent;
approval compares bank revisions at preview time. Deterministic preview IDs and a
class row lock make approval retries/concurrent double-clicks idempotent. No additional
provider, key, external account or background job is required.

## Accessible exam display

Students can choose standard/large/larger question text, scoped high contrast, visible
image descriptions and a keyboard-operable question jump selector. Preferences persist
per account on the device. These controls do not change answers, timing, required
questions or exam rules. Native radio/checkbox/select keyboard behavior is preserved;
question focus and text scaling support reduced motion and long equations. Screen
readers retain image alt text without duplicate caption announcements.

## Verification and remaining device checks

Automated checks cover real PostgreSQL APIs, permission boundaries, source tracking,
readiness publication, shuffled answer keys, preview tampering/staleness, atomic
approval/retry/concurrency, preference account isolation and editor input handling.

Chrome source-component checks cover 320/390/768/1440 px, Bengali, enlarged text,
dark/high-contrast presentation, native keyboard checkbox selection, question focus,
real file input/image processing, delayed/offline draft storage and browser Back.
Real locally hosted Tesseract workers/WASM/language files read English images,
raster-only PDFs and Bengali text. These tests use intercepted local resources and
mocked routing; they do not substitute for a running Next.js app integration test.

Physical Android camera permissions, hardware keyboard/IME resizing, hardware Back,
screen-reader interaction and background lifecycle remain pending. No phone was
connected through ADB; the user requested finishing available tests instead.
