# Security and quality review — 2026-11-23

Scope: local repository review, isolated PostgreSQL fixtures, registered API
routes, Next API proxy handlers, dependency advisories and desktop unit tests.
No external account was attacked; mail and push fixtures do not contact providers.
Existing classroom records are not used for write tests.

## Reproduced application findings

| Finding | Regression evidence | Correction |
|---|---|---|
| Refresh digest accepted as a credential | Reading a fixture's stored `sha256:` refresh digest and supplying it to Refresh succeeded before the fix. The same legacy lookup also allowed digest-based logout. | Reject the digest namespace before refresh/logout lookup. Raw legacy credentials still rotate once; ordinary refresh and session revocation behavior remain covered. |
| Verification resend exposed account state | Missing accounts returned `user not found`; verified accounts returned a different error. | Missing, verified and unavailable accounts have the same public success envelope. Operational failures are logged with a fixed category and produce the same response. Valid unverified accounts still receive mail. This is not a constant-time response guarantee. |
| Email verification capabilities stored in plaintext, consumed in separate statements | Registration/resend persisted the bearer token. Verification separately marked the token, marked the account and deleted tokens. | New verification tokens are digests at rest. A transaction locks the account, consumes one unexpired unused capability, updates the account and deletes its remaining links. Digest input is rejected; legacy raw links retain their original expiry. Concurrent verification accepts exactly one request. No existing token rows are rewritten. |
| Realtime ticket budget raced | 32 concurrent requests were all accepted despite an outstanding-ticket budget of eight. | Per-account PostgreSQL transaction advisory lock covers expired-ticket cleanup, count and insert. The regression requires eight successes and 24 throttled responses. Missing/inactive accounts cannot receive a successful ticket response. |
| API proxy could resolve a supplied authority | Handler-level tests passed `//attacker.invalid` and backslash authority forms to URL resolution; the configured origin changed and authorization headers reached the mocked fetch. | Reject ambiguous paths and assign pathname on the configured URL rather than resolving an untrusted URL reference. Tests require zero fetches for hostile paths and preserve valid path/query/body/auth behavior. API responses use `private, no-store`. |
| Web proxy buffered uploads without the API's size limit | `arrayBuffer()` consumed the entire incoming body before the backend could apply its limit. | Enforce the same 18 MiB ceiling on declared size and actual streamed bytes before fetch. Oversized chunked bodies cancel their reader and return 413; valid bodies are preserved. |
| Proxy error logging included upstream exception contents | Fetch errors were passed directly to the server console and can contain URLs with reset/verification capabilities. | Log a fixed failure category. A regression injects a capability-bearing exception and asserts the secret is absent from logs. |

The proxy regression exercises the exported handler with mocked fetch, without
outbound requests. It establishes the vulnerable handler behavior, not that every
path variant passes Next's network-level normalization in a deployed server.

## Dependency maintenance

The initial Go symbol scan reported 23 reachable vulnerability IDs across two
dependency modules and the old Go standard library. Imported/required modules
also had additional advisories. The Go 1.26 patch line is now 1.26.11, including
the production Docker builder and workspace/module minimum. Brotli, compress,
fasthttp and the affected `golang.org/x/*` modules are updated to patched versions.
The repeated Go symbol scan reports no vulnerabilities. Production npm audit was
clean; the full audit additionally found seven moderate development-tooling
findings in the typescript-eslint/minimatch chain. Updating that chain cleared
all seven without changing application package versions. CI now runs full npm
audit and pinned `govulncheck` on every quality run.

Primary advisory references:

- [Go release history](https://go.dev/doc/devel/release)
- [Brotli allocation advisory](https://pkg.go.dev/vuln/GO-2026-6888)

## Verification and limits

Passed locally:

- Frontend lint with zero warnings, TypeScript, 89 Node tests and production build.
- Full scoped Go tests and vet; Linux Go 1.26.11 race suite against isolated
  PostgreSQL, including session/verification races and the 32-request ticket test.
- `govulncheck v1.10.0`: no vulnerabilities found after the updates.
- Full npm audit after the development-tooling fix: zero vulnerabilities.
- 170 authenticated GET requests against existing records through read-only
  database connections.
- Desktop unit tests: 16 passed, two example-tester execution checks skipped
  because `EDUNEXUS_TESTER_EXE` is not supplied.
- Windows PowerShell 5.1 launcher: 20 checks, including delayed executable image
  metadata and cleanup when recording a newly started server fails. A real local
  restart reproduced the metadata race; the patched launcher starts the API,
  login/assets and API proxy successfully. No identity is assumed from a PID alone.

The helper now retries incomplete process image metadata for at most three
seconds while checking the original start time. Servers are started and recorded
through one helper; failures clean up via the original owned handle before a
state record exists. One failed QA run left an isolated Node timer process/temp
directory. Automatic approval review rejected the later targeted cleanup command
with `blocked by policy`; that cleanup is not included in the successful checks.

Tests reduce regression risk; they do not establish a perfect security score. Physical Android behavior,
production proxy configuration, provider delivery and sustained multi-replica
load are outside this local review. The existing desktop tester executes as the
desktop user after approval; it is not an operating-system sandbox.
