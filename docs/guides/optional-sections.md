# Optional classroom sections

Sections and filters are optional. Existing students have no assigned section, existing audience rules remain unchanged, and Everyone continues to mean the full class. No section setup or extra confirmation is required for ordinary create/publish flows. The existing classroom-level `section` label is not automatically converted or changed.

## Manage students

Teachers open **⋮ → Advanced class settings** inside a class:

- **Sections:** create or rename up to 50 sections. Names are unique within the class. Deleting an active/in-use section is refused; move students and change targeted content first. Inactive memberships may be cleared when an otherwise unused section is deleted.
- **Student sections:** search the enrolled roster and assign, transfer or clear a student's section. Changes require a reason and current roster version. Student rolls stay unchanged in this form.
- **CSV roster import:** use `name,email,roll,section`, up to 200 students/100 KB. Preview first, review row statuses, then confirm ready changes with a reason. Unknown sections, unenrolled accounts, mismatched names, duplicate emails/rolls and occupied rolls are skipped. Blank section explicitly clears a section. No accounts or memberships are created: invite students through Class enrollment first.
- **Student-view preview:** enter a full current roll to inspect visible/hidden exams, assignments, materials and announcements. This is a read-only visibility evaluation, not impersonation or an exam-start shortcut. Timing, device and admission checks continue to apply.

CSV commits re-check the preview under class/membership locks and reject stale versions. Roll changes are locked after any exam attempt or assignment submission; section transfers remain available. Changes are recorded in the roster journal and existing teacher activity feed.

## Combine section and roll rules

Content **Advanced settings → Audience** includes a section picker. Select one or more sections, optionally combined with odd/even, inclusive ranges or custom rolls. For example: Section A + odd rolls, or Section B + rolls 1–50. Selected sections form a union; the section condition and roll condition must both match. Exclusions still take precedence. Choosing Everyone resets extra targeting. Leaving the optional panel unused does not fetch a preview or require extra fields.

The same optional filters are available in attendance entry, progress and gradebook/report exports. With no filters, the entire class remains available. Attendance saves cannot modify rows outside the selected filter. Filtered gradebooks include relevant coursework; CSV exports include section names when present and retain the legacy layout when no sections exist.

A section transfer must not interrupt an exam already started or hide an existing assignment submission. Those resources remain accessible through the student's own participation record, and historical scores stay in progress/gradebook views. New content and missing-work indicators use current section/roll eligibility. Semester rollover copies section names and remaps copied resource audiences to the new class's section IDs; it does not enroll or assign students automatically.

## Release verification

Back up PostgreSQL and apply migration **53** before starting the API. The schema adds optional membership section IDs, roster versions, a section-aware audience predicate and audit events. Old two-argument audience callers retain their API. SQLC models were regenerated. A rollback hides section-targeted content for teacher review instead of widening it to Everyone.

Checks cover section ownership/versions, section+roll intersection, transfers preserving submitted work, attendance/progress/gradebook filters, CSV preview/commit/replay and protected rolls, student-view permissions, fresh migrations and race tests. Frontend tests verify optional defaults, section selection and CSV confirmation. Installed-Chrome source-rendered checks cover 320/390/768/1440 px, Bengali at 20 px and dark mode; routing/data providers are mocked. Automatic approval review rejected the live QA frontend start as `blocked by policy`, so that is not a full live Next end-to-end check. No external email or push was sent.
