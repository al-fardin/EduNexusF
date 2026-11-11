#!/bin/sh
set -eu
# A new disposable database only. Never restore into PGDATABASE.
backup=${1:?Provide the absolute dump path}
test -f "$backup"
test -f "$backup.sha256"
sha256sum -c "$backup.sha256"
target="edunexus_restore_$(date -u +%Y%m%d%H%M%S)_$$"
case "$target" in edunexus_restore_*) ;; *) exit 2 ;; esac
createdb "$target"
if ! pg_restore --exit-on-error --no-owner --no-acl -d "$target" "$backup"; then
  echo "Restore failed; retained $target for inspection" >&2
  exit 1
fi
psql -X -d "$target" -v ON_ERROR_STOP=1 -c 'SELECT count(*) AS restored_users FROM users; SELECT count(*) AS restored_classrooms FROM classrooms; SELECT count(*) AS restored_exams FROM classroom_exams; SELECT count(*) AS restored_calendar_events FROM classroom_calendar_events;'
if [ -n "${BACKUP_EXPECTED_USERS:-}" ]; then
  actual=$(psql -X -At -d "$target" -v ON_ERROR_STOP=1 -c 'SELECT count(*) FROM users')
  test "$actual" = "$BACKUP_EXPECTED_USERS"
fi
dropdb "$target"
echo "Verified backup: $(basename "$backup")"
