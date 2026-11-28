# Development and database scripts

Run commands below from the repository root. Script defaults also resolve that
root from their own location; callers may keep using the existing parameters.

| Task | PowerShell command |
| --- | --- |
| Start database services, API and frontend | `.\scripts\dev\start-local.ps1` |
| Check managed processes, ports and logs | `.\scripts\dev\start-local.ps1 -Action Status` |
| Restart managed API/frontend | `.\scripts\dev\start-local.ps1 -Restart` |
| Stop managed API/frontend | `.\scripts\dev\start-local.ps1 -Action Stop` |
| Start production frontend locally | `.\scripts\dev\start-local.ps1 -Production` |
| Apply learning feature migrations | `.\scripts\database\apply-learning-features.ps1` |
| Prepare migration SQL for inspection | `.\scripts\database\apply-learning-features.ps1 -SqlOnly` |
| Apply optional question tester migration | `.\scripts\database\apply-question-testers.ps1` |
| Back up local PostgreSQL | `.\scripts\database\backup-database.ps1` |
| Verify a backup in a new disposable database | `.\scripts\database\verify-restore.ps1 -Backup <backup-file>` |
| Bounded read-only HTTP load check | `node scripts/qa/load-readonly.mjs` |
| Test Windows launcher helpers | `.\scripts\qa\test-local-launcher.ps1` |

The local launcher supports Windows PowerShell 5.1. Defaults are web `3000` and
API `8080`; custom ports must be different. Set the same port options for status,
stop or restart. Use `-Restart -Production` to switch from development to a built
frontend; `-Restart` switches back. Next.js builds use `.next-local-<web-port>`.

Start Docker Desktop first. The command starts PostgreSQL/Redis/MinIO and waits
for readiness. Images download only if missing. Existing dependencies are reused;
`npm ci` runs only if Next.js is missing. `-SkipInfrastructure` uses an existing
database service and does not invoke Docker. The API reads the root `.env`.

Each app run has a folder under `release-builds/local-server/`, with separate
API, web, build and infrastructure stdout/error logs. Status prints the active
app log paths. For example, follow a displayed log using
`Get-Content '<log-path>' -Tail 40 -Wait`. Startup failures identify the log folder;
newly started app processes are cleaned up. Existing managed processes are reused
after identity and HTTP checks. Unknown port owners are reported for resolution.

Only a new empty PostgreSQL data volume runs `database/initialize-local.sh` via
Docker's initialization hook. It applies the complete schema transactionally and
records feature migrations. Existing database volumes and settings are preserved.
Existing-database upgrades require the explicit backup/migration commands above.
The launcher creates `.env` with a generated JWT secret only when `.env` is absent.
It does not print credentials, apply upgrades to existing databases or stop
database containers.

Verified on 2026-11-19: 17 Windows PowerShell 5.1 helper checks; real development
start/reuse/status/stop/restart; production build/start; login/assets/proxy health;
fresh PostgreSQL initialization through migration 57 with 37 tracked feature
migrations; refusal to initialize a nonempty database; and 170 read-only requests
against the existing database. Windows helper checks and empty-schema bootstrap
are included in quality CI. Optional provider/device configuration is unchanged.

`database/legacy/` preserves the old individual phase migration helpers. They are
not a substitute for the complete setup instructions. Moving scripts does not
apply migrations, change the database or start services.

Android and Windows client build scripts stay beside their respective projects:
[Android](../android-app/) and [browser extension](../chrome-extension/).
