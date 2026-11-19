#!/bin/sh
# PostgreSQL invokes this only for a new empty data volume. Existing databases
# retain their data and use the explicit migration/backup administration tools.
(
set -eu
tables=$(psql -X -At -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM pg_tables WHERE schemaname='public'")
if [ "$tables" != 0 ]; then echo 'Local initialization requires an empty database.' >&2; exit 1; fi
sql=$(mktemp)
trap 'rm -f -- "$sql"' EXIT HUP INT TERM
{
  printf '%s\n' 'BEGIN;'
  for migration in /edunexus-database/migrations/*.up.sql; do
    cat "$migration"
    printf '\n'
  done
  printf '%s\n' 'CREATE TABLE IF NOT EXISTS edunexus_feature_migrations(name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());'
  for migration in /edunexus-database/migrations/*.up.sql; do
    name=$(basename "$migration")
    case "$name" in 00000*|00001*|000020_*) continue ;; esac
    printf "INSERT INTO edunexus_feature_migrations(name) VALUES('%s') ON CONFLICT DO NOTHING;\n" "$name"
  done
  printf '%s\n' 'COMMIT;'
} > "$sql"
psql -X -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f "$sql"
)
