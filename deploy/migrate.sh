#!/bin/sh
set -eu
# Feature ledger is shared with APPLY_LEARNING_FEATURES.ps1. Back up existing
# databases and record already-applied migrations before the first import.
for migration in /migrations/*.up.sql; do
  name=$(basename "$migration")
  {
    printf '%s\n' '\set ON_ERROR_STOP on' 'BEGIN;' "SELECT pg_advisory_xact_lock(hashtextextended('edunexus-learning-migrations',0));" 'CREATE TABLE IF NOT EXISTS edunexus_feature_migrations(name TEXT PRIMARY KEY,applied_at TIMESTAMPTZ NOT NULL DEFAULT now());'
    printf "SELECT NOT EXISTS(SELECT 1 FROM edunexus_feature_migrations WHERE name='%s') AS apply_migration \\gset\n" "$name"
    printf '%s\n' '\if :apply_migration'
    cat "$migration"
    printf "\nINSERT INTO edunexus_feature_migrations(name) VALUES('%s');\n" "$name"
    printf '%s\n' '\endif' 'COMMIT;'
  } | psql -X -v ON_ERROR_STOP=1
done
