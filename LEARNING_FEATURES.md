# Learning features

This rollout adds exam recovery, question bank, assignments, app/email notifications, analytics and a source-grounded OpenAI tutor. Existing exams, questions, results and materials remain in place. Schema changes are additive.

## Apply

Back up the database using your normal backup process, then run from the repository root:

```powershell
powershell -File .\APPLY_LEARNING_FEATURES.ps1
```

This applies migrations 21–34 once, under a transaction and advisory lock. A ledger allows safe reruns. It supports the existing `edunexus-postgres` Docker container. For another PostgreSQL server, supply `-PsqlPath` and `-DatabaseUrl`. `-SqlOnly` writes the SQL into ignored `release-builds/` for inspection without applying it. Existing base migrations 1–20 are required.

Restart the API and frontend after applying migrations.

## Features

- **Exam recovery:** account-scoped local browser drafts, active-attempt discovery, revision conflict resolution, server clock alignment and submission receipts. Previously saved session drafts can still be recovered. Browser drafts are retained for up to 48 hours; successful save/submission clears them. Unsynced answers cannot be submitted after the server deadline. Browser storage restrictions can prevent durable recovery; the UI reports that condition.
- **Question bank:** teacher-only, per-classroom library with topic/difficulty filters, JSON import/export and random draws. Draws create independent copies in the exam draft. Save questions from the exam editor. Editing a bank item does not alter existing exams. This draws a draft set; it does not secretly change questions during a student's active attempt.
- **Assignments:** drafts and publication, deadline/late-work policies, text or file submission up to 15 MB, up to ten versions, idempotent retry, protected downloads, marks and feedback. Editing assignment settings locks after the first submission. Each submission version retains its own grade; analytics use the latest version.
- **Notifications:** navbar unread count, inbox, read/unread state and app/email preferences. Events cover publication, materials, announcements, results, assignment submissions and feedback. Deadline reminders are generated at 24 hours and 1 hour. A durable outbox retries failed email up to five times. Email delivery requires an active classroom membership and verified email address. Provider failures do not undo the academic operation. SMTP delivery is at least once; a failure after acceptance can produce a duplicate on retry.
- **Analytics:** read-only exam/assignment summaries, question-level performance, topic labels and graded-exam progress. Ungraded responses are excluded from scores. Student exam analytics require result publication and only include that student's responses. Teacher analytics show class aggregates without changing marks.
- **AI tutor:** teacher-managed text, TXT/Markdown and PDF material sources, private per-user history, follow-up context, source references, up to six text sources / two PDFs per request. PDF sources are limited to 8 MB each. Active exam attempts block student tutor access. New requests are limited to 30 per user per hour and 200 per classroom per day, including failed requests. The API replays completed request IDs without a second provider call.

## Email setup

Set these server environment variables (see `.env.example`):

```dotenv
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=
FRONTEND_URL=https://your-edunexus-site.example
```

The existing SMTP transport uses STARTTLS when offered and supports authenticated SMTP on port 587. Configure your mail provider's verified sender. The worker starts with the API, polls every 30 seconds, and stops when the API shuts down. No SMTP configuration means notifications remain visible in-app and email delivery is shown as awaiting setup.

## OpenAI setup

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
```

Keep the key on the API server. Use a model supporting PDF inputs and JSON-schema structured output. The tutor uses the Responses API with `store: false`, a 40-second provider timeout and an output token cap. Questions and selected class sources are sent to OpenAI only when a user asks a question. No private marking keys or unrelated classroom sources are retrieved. References are restricted to sources actually supplied to the model; answers should still be checked against the cited materials.

The integration follows official OpenAI documentation for [text generation](https://developers.openai.com/api/docs/guides/text), [file inputs](https://developers.openai.com/api/docs/guides/file-inputs) and [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

## Verification

```powershell
go test ./internal/... ./apps/api/... ./apps/set-role/...
cd frontend
node --test tests/exam-drafts.test.cjs
npm run build
```

Database integration tests run only when `EDUNEXUS_TEST_DATABASE_URL` points to a dedicated database named `edunexus_features` with migrations applied. They use generated fixture accounts and do not use the production database. OpenAI tests use a local HTTP test server and email tests use an in-memory mail transport; these tests incur no API costs and send no emails.

The repository contains ignored historical backup folders; broad `go test ./...` also discovers those incomplete snapshots. Use the scoped command above for current application packages. Pre-existing lint findings in older components remain separate from the checks for new components.

## Classwork and exam review

Classwork topics group assignments and materials without moving their storage. Teachers manage topics and resource placement; students only see published resource associations. Removing a topic leaves coursework intact. Existing pinned announcements, assignment history and late-work policies remain available.

Teachers can preview saved exams and unsaved drafts without creating student attempts, and write answer explanations on questions. Answer review is off by default. Enabling it releases expected answers and explanations only to the student’s own published result after the exam ends or is closed. Live question payloads exclude all marking keys and explanations.

## Device notifications and release

Opt-in browser Web Push and native Android FCM registrations are account-bound. Device bindings prevent a delayed logout from removing a newer registration. Push jobs recheck membership, account status, preferences and read state before delivery; expired registrations are removed. Browser push uses VAPID; Android requires matching Firebase client and server configuration. Unconfigured providers stay unavailable rather than reporting successful delivery.

Protected PDF/image previews and upload progress/cancel are available in messages and coursework. Offline navigation offers retry without caching private academic data. See `deploy/README.md` for HTTPS deployment, the signed Android workflow, the optional Docker coding runner, backups and isolated restore verification.
