# Go backend

The Go module path remains `github.com/edunexus/edunexus`. Moving the module into
this directory does not change package imports or API routes.

- `apps/`: API and administration entry points.
- `internal/`: services, handlers, repositories, infrastructure and tests.
- `docs/`: generated Swagger Go, JSON and YAML files.
- `sqlc.yaml`: reads the shared SQL in `../database/` and generates the existing
  `internal/platform/database/sqlc` package.

## Run from the repository root

```powershell
go run ./backend/apps/api
```

Keep the working directory at the repository root when running the API locally.
It loads the existing root `.env`, `uploads/` and other relative runtime paths.
The root Go workspace resolves the module automatically. The local launcher in
`scripts/dev/start-local.ps1` preserves that working directory too.

## Verify

These commands can run from the repository root:

```powershell
go vet ./backend/internal/... ./backend/apps/...
go test -p 1 ./backend/internal/... ./backend/apps/...
```

Set `EDUNEXUS_TEST_DATABASE_URL` to the isolated `edunexus_features` database to
include integration tests. Database scripts are documented in
[scripts](../scripts/README.md). No migration is required for this folder change.

Generate SQL bindings from this directory with `sqlc generate`. The deployment
Dockerfile copies this module into its builder; runtime paths inside the final
image remain unchanged.
