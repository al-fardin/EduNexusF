# Production security baseline

This baseline strengthens the deployed service; it is not a claim of perfect
security or certification. Local LAN testing stays in development mode.

## Enforced controls

- Production startup rejects non-HTTPS public origins, placeholder/short JWT
  secrets, access lifetimes above 30 minutes, missing/separate proxy secrets,
  missing 32-byte Base64 MFA encryption keys and weak database passwords.
- Remote PostgreSQL requires `verify-full` TLS. Plaintext is accepted only with
  explicit `ALLOW_PRIVATE_DATABASE=true` and a loopback/private IP or the isolated
  Compose `postgres` service. The release database network is internal and has no
  published ports. Do not use this exception for a public database.
- Migration 58 creates opaque HMAC request budgets. Production startup checks
  that the table exists. Login, registration, verification, recovery, refresh and
  logout share limits across API replicas. Login/recovery also limit each email,
  even when source IPs rotate. JSON/form/XML use the same DTOs as their handlers.
  Failure to acquire/update a budget returns 503, rather than bypassing it.
  MFA-management limits are keyed by the authenticated account, so teachers
  sharing a school/proxy IP do not consume each other's allowance. Factor replay
  and the five-failure lockout remain serialized in PostgreSQL.
- Caddy owns HTTPS and routes `/api/*` directly to the API. It overwrites client
  IP/proof headers. The API accepts this identity only with the server-side
  `TRUSTED_PROXY_SECRET`; arbitrary forwarding headers do not choose an identity.
  The fallback Next proxy strips these proof headers. Keep API and frontend ports
  private. A different gateway must reproduce this trust boundary deliberately.
- Production CORS allows the configured frontend origin. Native clients without
  an Origin header still use bearer authentication. CORS is not authorization.
- API responses are private/no-store and nosniff. HTTP-level compressed request
  bodies are rejected before Fiber decompresses them; compressed attachment
  files inside ordinary multipart uploads remain supported. Duplicate encoding
  headers cannot bypass the policy. Auth bodies are limited to 16 KiB, general
  bodies to 18 MiB; network reads/writes have two-minute deadlines.
- Public Swagger/demo routes are absent in production. The gateway prevents
  framing and restricts base/object embedding and unused browser permissions.
  This is not a full script-nonce CSP; do not describe it as complete XSS protection.
- Remote SMTP requires verified TLS (STARTTLS or implicit TLS on 465), with TLS
  1.2 minimum. Plaintext loopback capture servers remain usable for development.
- API/frontend run as non-root with read-only roots, dropped capabilities and
  no-new-privileges. Only uploads, explicit caches and temporary storage are
  writable. The default release does not mount the Docker socket.
- Production native Windows testers are disabled by default. Setting
  `ALLOW_TRUSTED_NATIVE_TESTERS=true` explicitly reopens the trusted-teacher
  channel. Those executables run as the desktop user after approval, not in an
  OS sandbox. Do not enable this for arbitrary/untrusted uploaders. Downloaded
  executables cannot be recalled by changing the setting. Local development
  retains its existing approval flow. Server-side coding containers remain an
  optional, separate execution-host deployment.

## Deployment steps

1. Back up existing database and uploads together. Apply migration 58 through the
   existing migration ledger; do not replay the historical chain against a live,
   untracked database. Local development does not require this new production
   limiter table until production mode is enabled.
2. Set `JWT_ACCESS_EXPIRE=15m`, a unique generated JWT secret, a separate generated
   `TRUSTED_PROXY_SECRET`, a strong database password and a persistent
   `MFA_ENCRYPTION_KEY`. Preserve an existing MFA key; rotating it without a
   migration makes existing encrypted authenticator secrets unreadable. Keep a
   protected copy outside the database backup. Never put secrets in web/APK
   builds or Git.
3. Configure the real HTTPS domain and SMTP provider. Use a DNS-only domain to
   reach Caddy directly. If adding a CDN/WAF, configure its authenticated client-IP
   trust at Caddy first; this default deliberately uses the immediate peer address
   instead of accepting public forwarded headers.
4. Use the release Compose configuration, not local `docker-compose.yml`, online.
   Run `python scripts/qa/check-deployment.py` and validate the Caddyfile. The
   additional deployment CI job checks these controls on every change.
5. Test real HTTPS login/refresh/logout, account revocation, mail delivery, phone
   upload/calls and paired restore before opening registration broadly. Enable
   teacher/admin MFA through the existing profile controls.

Budgets use one-minute windows, not an exact sliding-window algorithm. IP budgets
allow up to 120 login/refresh/logout requests per minute and 20 for the other
protected endpoints. Per-email login limits are 20; recovery/resend limits are 5.
429 includes conservative `Retry-After: 60`. Expired quota rows are removed in
indexed batches of up to 10,000 per active replica/minute. Monitor database size
and traffic on an actual host; these are abuse limits, not a capacity benchmark.

## Verified scope

Regression tests exercise two independent limiters against the same isolated
PostgreSQL database: 40 requests from rotating authenticated IPs admit five email
requests and reject 35; uppercase routes, alternate body formats, forged proxy
metadata, expiry and unavailable storage are covered. Real production-router
tests verify the account budget, private headers and hidden debug routes.
Configuration, SMTP downgrade and default native-tester policies have tests.
Caddy validates its actual configuration, and Compose isolation is checked using
example settings without reading deployment secrets.

Verified locally on 2026-11-23: full scoped Go tests/vet and the Linux race suite;
frontend zero-warning lint, TypeScript, 90 Node tests and production build; 170
authenticated GET requests against existing data through read-only connections;
actual Caddy configuration validation and the Compose isolation check. GitHub
secret scanning and push protection were already enabled; private vulnerability
reporting is now enabled as well. Quality CI adds a deployment-isolation job to
its existing dependency scans, restore, Android and desktop checks.

Infrastructure
firewalls, CDN/WAF/DDoS controls, least-privilege hosted database roles, protected
secret/backups storage, provider delivery and physical devices still require the
actual hosting environment. The code cannot establish those properties from a
local laptop. Arrange an independent penetration test before a high-stakes public
launch. Follow the security reporting policy for newly discovered issues.
