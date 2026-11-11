# Academic release operations

## Backups and restore verification

The optional recovery service uses the same PostgreSQL 17 image as the deployment.
It creates a database dump plus an uploads archive, writes SHA-256 checksums and
checks archive readability. Every successful dump is restored into a **new**
`edunexus_restore_*` database. Schema/data queries must succeed before this
temporary verification database is dropped. Failed restores remain for inspection.
The live database and uploads are never overwritten by verification.

On a configured deployment, enable daily recovery from the repository root:

```powershell
docker compose --env-file deploy/.env -f deploy/compose.yml -f deploy/compose.recovery.yml up -d recovery
```

The first cycle runs immediately; later cycles default to 86,400 seconds. The
interval is configurable, with a five-minute minimum. Failures retry after five
minutes. `deploy/backups/last-verified.txt` records the latest successful cycle.
Check container logs and this timestamp; a backup older than 26 hours warrants
investigation with the default daily interval. Keep these private backups off
the web server's public paths and copy them to independent storage. Automatic
retention/deletion is deliberately not enabled.

Database and file snapshots are separate operations. For an exact shared point
in time during active uploads, pause writes during backup or use a coordinated
storage snapshot. Archive integrity alone does not prove application-level
consistency across concurrent writes.

The **Recovery verification** GitHub workflow also bootstraps a disposable schema,
inserts a sentinel user, backs up/restores it and verifies its row count. It runs
on manual dispatch and weekly (Monday 02:20 Asia/Dhaka). This CI drill contains
fixtures, not production backups. Hosting credentials and external backup storage
are not configured by committing the workflow.

## Error monitoring

- `/health/ready` checks database connectivity with a two-second deadline and
  returns only `ready` or `unavailable`. Existing `/health` remains available.
- Unexpected API errors return a generic message instead of database details.
  The response retains `X-Request-ID`. Server-error and slow-request logs identify
  the route, request ID and status/duration without copying request bodies.
- `/ops/metrics` exposes bounded Prometheus-format process counters. Set a
  separate random `OBSERVABILITY_TOKEN` of at least 32 bytes and provide it as a
  Bearer token when scraping. Missing or incorrect tokens receive 404. Do not use
  a user's login token or expose this operator secret to the frontend.
- Counters cover requests, server/client errors, requests slower than two seconds
  and browser runtime/rejection/boundary errors. They reset on API restart; scrape
  them to retained monitoring storage when deploying multiple instances.
- Browser reports contain a fixed category only: no error messages, stacks, URLs,
  user IDs or message contents. They require login, throttle repeats on the device
  and are rate-limited on the API. Failed reports are dropped. The error boundary
  offers an explicit retry without discarding saved work.

An external monitoring dashboard and alert destination are not provisioned here.
Configure your chosen operator monitoring to alert on readiness failure, repeated
server errors, slow-request increases and stale backup verification timestamps.

## Verification completed on 2026-11-12

- Fresh migrations 1–42, isolated PostgreSQL integration tests and Linux Go race
  tests; formatting and vet. A real database backup preceded migration 42.
- A live database dump was restored into a new disposable database and verified.
  The backup loop also completed a full database/uploads backup and restore cycle;
  its isolated QA container was then stopped. No production recovery service was
  enabled on the user's laptop.
- 501 students × 100 assignments: complete Progress and Gradebook responses.
  A representative local run completed both reads in approximately 171 ms.
- 40 simultaneous fixture students: 160 entry/autosave/submit/replay operations;
  exactly 40 submitted attempts, preserved answers and no duplicate attempts.
- Read-only HTTP probe: 120 requests, concurrency 10, all HTTP 200, p50 17 ms,
  p95 43 ms and p99 61 ms against the local QA data. These measurements are local
  regression evidence, not production capacity guarantees.
- Frontend lint, TypeScript, 32 Node tests and isolated production build.
- Installed headless Chrome: global search/open/refresh, submission ZIP download,
  CSV preview before persistence and confirmed import, teacher-created calendar
  event and personal reminder, attendance entry and student history, teacher-only
  control isolation, 390px layouts, Bengali and 18px text preference persistence,
  and keyboard skip navigation. No JavaScript page errors in those checks.

Run the bounded HTTP probe with Node's built-in fetch; no load tool installation:

```powershell
$env:EDUNEXUS_LOAD_URL='http://127.0.0.1:8088'
$env:EDUNEXUS_LOAD_CONCURRENCY='10'
$env:EDUNEXUS_LOAD_REQUESTS='120'
node scripts/qa/load-readonly.mjs
```

It defaults to readiness requests. Authenticated paths can be supplied as a JSON
array in `EDUNEXUS_LOAD_PATHS` with a test token in `EDUNEXUS_LOAD_TOKEN`. Remote
origins require explicit `EDUNEXUS_ALLOW_REMOTE_LOAD=yes`; paths must stay on the
same origin, redirects are refused, and only GET requests are sent. Non-2xx results
or p95 above 2,000 ms fail the probe; override `EDUNEXUS_LOAD_P95_MS` when setting
a justified test budget. Never use real exam submissions for load generation.
