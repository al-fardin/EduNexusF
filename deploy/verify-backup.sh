#!/bin/sh
set -eu
# A new disposable database only. Never restore into PGDATABASE.
backup=${1:?Provide the absolute dump path}
verify_checksum() {
  test -f "$1" && test -f "$1.sha256"
  expected=$(awk 'NR==1 {print tolower($1)} END {if (NR!=1) exit 1}' "$1.sha256")
  printf '%s\n' "$expected" | grep -Eq '^[0-9a-f]{64}$'
  actual=$(sha256sum "$1" | cut -d ' ' -f 1)
  test "$actual" = "$expected"
}
verify_checksum "$backup"
uploads=${2:-}
# Production backup pairs must never be marked verified with a missing archive.
case "$(basename "$backup")" in
  edunexus-*.dump) if [ -z "$uploads" ]; then uploads="$(dirname "$backup")/uploads-$(basename "$backup" .dump | sed 's/^edunexus-//').tar.gz"; fi ;;
esac
scratch=$(mktemp -d)
trap 'rm -rf -- "$scratch"' EXIT HUP INT TERM
if [ -n "$uploads" ]; then
  verify_checksum "$uploads"
  tar -tzf "$uploads" > "$scratch/paths"
  awk '/(^\/|(^|\/)\.\.(\/|$))/ {bad=1} END {exit bad}' "$scratch/paths"
  tar -tvzf "$uploads" > "$scratch/types"
  # Symlinks, hard links and devices are not application upload files.
  awk 'substr($0,1,1)!="-" && substr($0,1,1)!="d" {bad=1} END {exit bad}' "$scratch/types"
  mkdir "$scratch/uploads"
  tar -xzf "$uploads" --no-same-owner --no-same-permissions -C "$scratch/uploads"
fi
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
if [ -n "$uploads" ]; then
  psql -X -At -F "$(printf '\t')" -d "$target" -v ON_ERROR_STOP=1 -c "
    SELECT 'materials/'||classroom_id::text||'/'||storage_key,file_size,'' FROM classroom_materials
    UNION ALL SELECT 'messages/'||storage_key,file_size,file_hash FROM classroom_messages WHERE storage_key<>'';
  " > "$scratch/references"
  count=0
  while IFS="$(printf '\t')" read -r path size digest; do
    printf '%s\n' "$path" | grep -Eq '^(materials/[0-9a-f-]{36}/|messages/)[0-9a-f-]{36}$'
    file="$scratch/uploads/$path"
    test -f "$file"
    test "$(wc -c < "$file" | tr -d ' ')" = "$size"
    if [ -n "$digest" ]; then test "$(sha256sum "$file" | cut -d ' ' -f 1)" = "$digest"; fi
    count=$((count+1))
  done < "$scratch/references"
  echo "Verified restored upload references: $count"
fi
if [ -n "${BACKUP_RESTORE_REPORT:-}" ]; then
  # Retain only this newly created verification database for application checks.
  if [ -n "$uploads" ]; then
    test -n "${BACKUP_RESTORE_UPLOADS_DIR:-}"
    mkdir "$BACKUP_RESTORE_UPLOADS_DIR"
    cp -R "$scratch/uploads/." "$BACKUP_RESTORE_UPLOADS_DIR/"
  fi
  printf '%s\n' "$target" > "$BACKUP_RESTORE_REPORT"
else
  dropdb "$target"
fi
echo "Verified backup: $(basename "$backup")"
