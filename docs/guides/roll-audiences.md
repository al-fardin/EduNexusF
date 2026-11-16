# Optional roll audiences

**Everyone is the default.** Teachers do not need to open Advanced settings or confirm an audience to create/publish normally. Existing exams, assignments, materials, posts and announcement drafts retain `{"mode":"all"}`. Preview is fetched only when the optional panel is opened.

## Controls

Creation/editing forms for exams, assignments and announcements, scheduled announcement drafts and material uploads share **Advanced settings → Audience**:

| Choice | Example |
| --- | --- |
| Everyone | All active students, including students without a roll |
| Odd rolls | 001, 003, CSE-021 |
| Even rolls | 002, 004, CSE-022 |
| Roll ranges | 1–50, or 51–100; both bounds included |
| Custom rolls | Full values such as `001`, `050`, `CSE-021` |
| Mixed audience | Odd rolls in 1–50, plus custom `088`, excluding `003` |

Numeric rules use the final ASCII number in a roll; leading zeroes do not affect numeric matching. `CSE-021` means 21. A roll without a final number requires a full custom value. Custom/excluded rolls are case-normalized exact values: `001` and `1` are different custom values.

Mixed rules apply parity **and** any configured numeric range. Additional custom rolls are included as a union. Exclusions always remove a roll, including a custom inclusion. Limits are 20 ranges, 1,000 custom values and 1,000 exclusions; range bounds are 0–999999999999.

Preview shows the current selected/total count and up to 50 selected rolls. A valid rule with no current matches can be saved for matching students who enroll later. Rules are evaluated against active membership/current rolls rather than a frozen copy of the roster. The Everyone option resets extra targeting choices. Closing the panel retains a deliberate selection, which remains visible in its summary. Non-default audiences also have compact teacher badges on resource cards.

## Access and existing workflows

Teachers can manage their class content; student access follows the audience as well as existing publication, membership, roll, monitoring and exam-device rules. A forwarded ID/link cannot bypass audience checks for exam access/start/attempts or assignment/material access.

Filtering applies before pagination to stream, classwork, search, files, workspace activity, task inbox, calendar and archived contents. Material-backed tutor sources follow material visibility. Notifications, unread counts and queued email/push delivery respect the current audience. Scheduled materials do not notify students at private upload time; notification occurs when their stream entry is published.

Progress, missing-work counts and gradebook cells only include work assigned to each student. Other cells are **Not assigned**, rather than Missing. Copy/semester rollover preserves audience rules. Scheduled content preserves the audience through publication. Existing attempt/submission locks still prevent changing exam/assignment targeting after students have started/submitted. An omitted audience on older update clients preserves the existing audience instead of widening it.

## Deployment and verification

Back up PostgreSQL and apply migration **52** before starting the updated API. The migration adds defaulted audience columns, shared predicates and recipient-aware publication notification functions. Stream queries/models were regenerated with SQLC from the migration/query sources.

Verification includes Go/database predicate agreement, 100-student odd/even/range/custom/mixed previews, actual JWT-protected route tests for direct and indirect access, scheduled material audience preservation, default Everyone creation, frontend payload/optional-form tests, native Chrome form validation and mobile/Bengali/dark-mode checks. Chrome component checks mock routing/data; a live QA Next frontend could not be started because automatic approval review returned `blocked by policy`. No external email/push was sent during verification.
