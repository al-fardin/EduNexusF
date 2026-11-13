# Class join approval and student invitations

## Choose how students join

When creating a class, use the **Class enrollment** section. For an existing class, open **Classroom options → Class enrollment → Join settings**.

The class owner can choose:

- **Join directly:** a valid code and unique student roll create membership immediately.
- **Teacher approval required:** the student submits a request; classroom content stays inaccessible until a teacher approves it.
- **Allow joining with class code:** turn this off to use email invitations only.
- **Set class code expiry:** choose a date/time in the device's local timezone. Leaving it unset keeps the code valid indefinitely. New expiry dates on class creation must be in the next year.

Existing classes default to direct joining, enabled codes and no expiry. These settings do not remove existing members. Settings reject stale concurrent edits. Code lookup and the actual join submission both recheck expiry/access; verifying a code before its expiry does not bypass a later expiry.

## Review requests

Students submit their roll with the request and can track or withdraw it in **Invitations & join requests**. Teachers use the classroom enrollment panel to approve or reject requests. Rejection can include a reason. The owner can delegate review/invitations through the co-teacher **people** permission; join-policy changes remain owner-only.

Pending requests do not reserve a roll or create membership. Approval checks roll uniqueness again. If another student has taken that roll, the request stays pending; the student can resubmit a different roll while the code is valid. Old teacher decisions cannot overwrite a newer student request. Repeat unchanged pending submissions reuse the same request. Status transitions retain audit events.

Changing the policy to direct joining does not silently approve existing requests. A student can explicitly join again under the new policy. Teachers can explicitly approve previously submitted requests after a code expires, provided the class remains active.

## Invite by email

Open **Class enrollment → Email invitations**, enter one student email and choose **Send invitation**. This creates an invitation, not an automatic enrollment. It works for existing accounts and for students who register later with that email.

The student opens **Invitations**, signs in with the same email and verifies it, then chooses **Accept invitation** or **Decline invitation**. Acceptance requires a unique roll. No class code is needed, so a valid invitation also works when code joining is disabled, expired or requires approval. Acceptance closes an obsolete pending request for the same class. Students cannot use another recipient's invitation or downgrade a teacher membership into a student membership.

Invitations expire seven days after creation/resend. Teachers can revoke a pending invitation or resend after ten minutes. Resending refreshes expiry/version; stale accept/revoke actions are rejected. Existing active members cannot be invited again. Archived/deleted classes cannot admit students.

In-app invitations appear in the student inbox and notification/home notices after email verification. Email links point to the same inbox, with the intended invitation first. Signing in preserves the invitation destination. There is no bearer-link enrollment: a forwarded link still requires the verified recipient account and explicit acceptance.

## Email delivery and limits

Configure server SMTP and a `FRONTEND_URL` origin (HTTPS for a hosted workspace; localhost HTTP is supported for development). Without these, in-app invitations still work and the teacher panel states that email delivery awaits configuration. The invitation is never marked sent merely because it was created. Signup and resend verification emails also use this public origin; an empty origin retains the local development fallback.

An outbox worker retries delivery up to five attempts. Delivery is at least once; a crash after SMTP accepts a message can produce a repeated email, but cannot grant duplicate membership. Lease/version checks prevent a stale worker from overwriting a renewed, answered or revoked invitation's state. The worker does not claim expired/revoked invitations or invitations for recipients already in the class. An email already in flight may still arrive after revocation; acceptance always checks the current invitation state. Email content escapes class/teacher names and shows the actual expiry timestamp.

Limits are 100 invitation creations/resends per teacher/day, a ten-minute per-class/email resend interval and 20 new/changed join requests per student/day. Existing membership and roll rules continue to apply. Accept/review actions require an online connection.

## Deployment and verification

Back up PostgreSQL, then apply `scripts/database/apply-learning-features.ps1` through migration **50** before starting the new API. The migration adds policy fields, pending requests, invitations, audit events and the invitation outbox. Semester rollover copies the source admission policy and expiry; renew an expired copied code explicitly in the new class settings. It does not copy requests or invitations.

Verification includes fresh PostgreSQL migrations, race tests, real HTTP API requests against an isolated fixture database, fake SMTP retry/escaping/lease tests, create-form payload tests, production frontend builds and source-rendered Chrome component checks. Phone/tablet/desktop widths, Bengali at 20 px, dark mode and native roll validation were checked without starting another Next server. The live Next frontend was not restarted; no live external invitation email was sent.
