# Task inbox, moderation and account security

## Task inbox

**Task inbox** combines student pending/overdue assignments, teacher submissions needing grading, exams in the next 30 days, open rechecks and unread class notifications. Filter by class or task type. Coursework links preserve the assignment/tab; supported notification links open their target. Tasks are derived from current active memberships and update when the underlying work changes. Reading a notification does not complete an assignment. Lists paginate in batches of 50.

## Co-teachers and moderation

The class owner opens **Classroom options → Co-teacher permissions**, adds an existing active, verified instructor/admin account and selects permissions. An existing student membership cannot be promoted here. Newly added staff start with no module permissions. Existing co-teachers retain their previous access until the owner saves explicit settings.

Permissions cover coursework, grading, attendance, people, messaging, moderation and reports. Server checks apply to classroom routes, not just hidden buttons; calling also checks messaging permission. Only the owner can change class settings/course code, archive/restore or delete the class, manage staff permissions or change storage quotas. Reports containing grades require deliberate report access; preparing a report uses the grading roster. Removed staff lose active classroom access.

Conversation settings include **Block conversation**. Either participant can block new messages and calls; each controls their own block. Existing messages remain readable. A block does not erase copies or retroactively disconnect an already established peer-to-peer media stream. Teacher class-wide/student messaging restrictions continue to apply.

The message action menu exposes **Report message** for another participant's undeleted message. The report copies only that message's text/filename and the reporter's reason. Class moderators can review this snapshot without gaining access to the private conversation or attachment. A reporter or reported sender cannot decide their own report; another moderator is required. Decisions require a reason, reject stale versions, and retain history. Reports do not change grades or automatically punish accounts. Reports are limited to ten per reporter/day; repeat reports for the same message reuse the existing receipt.

## Storage

**Storage** shows classes the caller owns, including archived classes. Each class starts with a 500 MB quota, configurable by its owner from 10 MB to 2 GB. Usage includes material files (even hidden ones), all assignment attachment versions, message attachments and question testers. Concurrent database writes serialize quota checks; an upload that would exceed quota is rejected. Existing data is not deleted when migrations add a quota.

The largest-file list paginates. Other participants' private message filenames are not disclosed to the owner. Materials are managed through their classroom; deletion first shows the tracked stream/syllabus references and requires a reason. External links and previously downloaded copies cannot be detected or recalled. Active academic submissions/testers are not automatically purged to save space.

## Academic reports

Open **Classroom options → Academic reports**. Teachers choose a student, add an optional note, and create a private preview. The saved snapshot combines attendance and graded coursework, excluding unpublished exam marks. A teacher then publishes it with a reason; the student receives a notification and can see only their own published reports. Later mark/attendance changes do not silently change an existing report. Withdraw an obsolete report and prepare a new one; withdrawal retains its event history and cannot revoke downloaded copies.

Reports export as paginated A4 PDFs and plain text. Canvas renders Unicode/Bengali with the browser's fonts; PDF pages are images, not tagged/searchable text. The HTML preview and text export provide the readable alternative. Export runs locally in the browser and does not upload grades to a third-party PDF service. Draft PDFs remain teacher previews. Creation supports 100 reports per teacher/day and a 250 KB snapshot per report.

## Account security

**Profile → Devices & verification** lists up to 20 active sessions and allows a specific device to be signed out. Device labels come from the user agent and are descriptive, not device attestation. “Last refreshed” is the token refresh time. New refresh credentials are hashed in PostgreSQL, rotate once, and share the session's absolute seven-day expiry. Revocation invalidates that session's access and refresh credentials; live invalidation sockets recheck within 20 seconds. Password changes/resets and logout-all revoke sessions. A password reset does not remove an authenticator.

Older installations register a device on refresh or re-login; their earlier access tokens do not have a device ID. Logout-all also invalidates those legacy tokens. Existing downloaded/offline copies are not remotely erased by revocation.

Verified instructor/admin accounts can enable an authenticator using a manual setup key. It follows RFC 6238 with six digits, SHA-1 and 30-second steps, accepts one adjacent step for clock drift, and rejects reused steps. A current password and proof from the authenticator are required for activation. Enabling preserves the proven current session and revokes others. Eight high-entropy recovery codes are shown once and stored only as hashes; each works once. Five failed factor attempts lock factor verification for 15 minutes. Recovery codes can also disable MFA if an authenticator/key becomes unavailable.

Set a private, persistent 32-byte Base64 `MFA_ENCRYPTION_KEY` on the API server. Local development can run `scripts/dev/initialize-security-key.ps1`; it preserves an existing key and never prints it. Authenticator secrets are AES-GCM encrypted and bound to their user ID. Back up this key separately with protected database backups. Do not generate a new key during deployments, commit it, or put it in frontend/mobile configuration. Without it, new setup is unavailable. Loss of the key requires recovery codes or restoring the original key.

## Release guide and notification navigation

The short guide appears once per verified account/browser, and **Profile → Quick guide** reopens it. Unverified accounts retain the existing login verification prompt. **What's new** shows the 1.5.0 changes. Notification/classroom destinations survive sign-in through a validated internal return path; external redirect destinations are rejected. Academic report links open the report panel directly.
